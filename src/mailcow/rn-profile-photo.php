<?php
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 RN Design & Serviços
declare(strict_types=1);

require_once $_SERVER['DOCUMENT_ROOT'] . '/inc/prerequisites.inc.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function rn_photo_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    exit;
}

function rn_photo_email_domain(string $email): string
{
    $position = strrpos($email, '@');
    return $position === false ? '' : strtolower(substr($email, $position + 1));
}

function rn_photo_same_origin(): bool
{
    if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && $_SERVER['HTTP_SEC_FETCH_SITE'] !== 'same-origin') {
        return false;
    }

    $source = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    if ($source === '') {
        return false;
    }

    $sourceHost = strtolower((string) parse_url($source, PHP_URL_HOST));
    $requestHost = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    return $sourceHost !== '' && hash_equals($requestHost, $sourceHost);
}

if (!isset($_SESSION['mailcow_cc_role'], $_SESSION['mailcow_cc_username']) ||
    $_SESSION['mailcow_cc_role'] !== 'user') {
    rn_photo_json(401, ['ok' => false, 'error' => 'authentication_required']);
}

$currentEmail = strtolower(trim((string) $_SESSION['mailcow_cc_username']));
if (!filter_var($currentEmail, FILTER_VALIDATE_EMAIL)) {
    rn_photo_json(401, ['ok' => false, 'error' => 'invalid_session']);
}

$photoDirectory = $_SERVER['DOCUMENT_ROOT'] . '/img/rn-profile-photos';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET' || $method === 'HEAD') {
    $targetEmail = strtolower(trim((string) ($_GET['email'] ?? $currentEmail)));
    if (!filter_var($targetEmail, FILTER_VALIDATE_EMAIL) ||
        rn_photo_email_domain($targetEmail) !== rn_photo_email_domain($currentEmail)) {
        rn_photo_json(403, ['ok' => false, 'error' => 'photo_access_denied']);
    }

    $photoPath = $photoDirectory . '/' . hash('sha256', $targetEmail) . '.jpg';
    if (!is_file($photoPath)) {
        rn_photo_json(404, ['ok' => false, 'error' => 'photo_not_found']);
    }

    $modified = (int) filemtime($photoPath);
    $etag = '"' . hash_file('sha256', $photoPath) . '"';
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        http_response_code(304);
        exit;
    }

    header('Content-Type: image/jpeg');
    header('Content-Length: ' . filesize($photoPath));
    header('Cache-Control: private, max-age=300');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $modified) . ' GMT');
    header('ETag: ' . $etag);
    if ($method === 'GET') {
        readfile($photoPath);
    }
    exit;
}

if (!in_array($method, ['POST', 'DELETE'], true)) {
    header('Allow: GET, HEAD, POST, DELETE');
    rn_photo_json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

if (($_SERVER['HTTP_X_RN_PROFILE'] ?? '') !== '1' || !rn_photo_same_origin()) {
    rn_photo_json(403, ['ok' => false, 'error' => 'request_rejected']);
}

$photoPath = $photoDirectory . '/' . hash('sha256', $currentEmail) . '.jpg';

if ($method === 'DELETE') {
    if (is_file($photoPath) && !unlink($photoPath)) {
        rn_photo_json(500, ['ok' => false, 'error' => 'delete_failed']);
    }
    rn_photo_json(200, ['ok' => true, 'removed' => true]);
}

$declaredLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($declaredLength < 1 || $declaredLength > 3 * 1024 * 1024) {
    rn_photo_json(413, ['ok' => false, 'error' => 'image_too_large']);
}

$rawImage = file_get_contents('php://input', false, null, 0, 3 * 1024 * 1024 + 1);
if ($rawImage === false || $rawImage === '' || strlen($rawImage) > 3 * 1024 * 1024) {
    rn_photo_json(400, ['ok' => false, 'error' => 'invalid_image']);
}

$imageInfo = @getimagesizefromstring($rawImage);
$mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($rawImage);
$allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
if ($imageInfo === false || !in_array($mime, $allowedMimes, true)) {
    rn_photo_json(415, ['ok' => false, 'error' => 'unsupported_image']);
}

$width = (int) $imageInfo[0];
$height = (int) $imageInfo[1];
if ($width < 256 || $height < 256 || abs($width - $height) > 1 || $width > 2048 || $height > 2048) {
    rn_photo_json(422, ['ok' => false, 'error' => 'invalid_crop']);
}

$sourceImage = @imagecreatefromstring($rawImage);
if ($sourceImage === false) {
    rn_photo_json(422, ['ok' => false, 'error' => 'decode_failed']);
}

$outputImage = imagecreatetruecolor(512, 512);
$white = imagecolorallocate($outputImage, 255, 255, 255);
imagefill($outputImage, 0, 0, $white);
imagecopyresampled($outputImage, $sourceImage, 0, 0, 0, 0, 512, 512, $width, $height);
imagedestroy($sourceImage);

if (!is_dir($photoDirectory) && !mkdir($photoDirectory, 0750, true) && !is_dir($photoDirectory)) {
    imagedestroy($outputImage);
    rn_photo_json(500, ['ok' => false, 'error' => 'storage_unavailable']);
}

$temporaryPath = tempnam($photoDirectory, '.rn-upload-');
if ($temporaryPath === false || !imagejpeg($outputImage, $temporaryPath, 90)) {
    imagedestroy($outputImage);
    if ($temporaryPath && is_file($temporaryPath)) {
        unlink($temporaryPath);
    }
    rn_photo_json(500, ['ok' => false, 'error' => 'encode_failed']);
}
imagedestroy($outputImage);

chmod($temporaryPath, 0640);
if (!rename($temporaryPath, $photoPath)) {
    unlink($temporaryPath);
    rn_photo_json(500, ['ok' => false, 'error' => 'save_failed']);
}

clearstatcache(true, $photoPath);
rn_photo_json(200, [
    'ok' => true,
    'url' => '/rn-profile-photo.php?v=' . (int) filemtime($photoPath),
]);

