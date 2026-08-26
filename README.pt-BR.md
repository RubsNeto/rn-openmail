<div align="center">
  <img src="assets/brand/rn-logo.png" alt="RN Mail" width="260">
  <h1>RN Mail Theme</h1>
  <p>Uma interface refinada e centrada em domínios para mailcow e SOGo.</p>

  [![CI](https://github.com/RubsNeto/rn-mail-theme/actions/workflows/ci.yml/badge.svg)](https://github.com/RubsNeto/rn-mail-theme/actions/workflows/ci.yml)
  [![CodeQL](https://github.com/RubsNeto/rn-mail-theme/actions/workflows/codeql.yml/badge.svg)](https://github.com/RubsNeto/rn-mail-theme/actions/workflows/codeql.yml)
  [![Versão](https://img.shields.io/github/v/release/RubsNeto/rn-mail-theme)](https://github.com/RubsNeto/rn-mail-theme/releases)
  [![Licença](https://img.shields.io/badge/licen%C3%A7a-GPL--3.0%20%2F%20GPL--2.0-blue)](NOTICE.md)

  [English](README.md)
</div>

O RN Mail Theme aplica a experiência visual completa da RN a uma instalação existente do **mailcow: dockerized**: entrada, páginas de usuário, administração, operações de domínio e webmail SOGo. Ele é uma camada de frontend, não uma distribuição de servidor de e-mail, e não altera o transporte nem as mensagens armazenadas.

> [!IMPORTANT]
> Este é um projeto comunitário independente, sem afiliação ou endosso do mailcow ou do SOGo.

## Destaques

- Domínios são o destino principal do administrador, com navegação direta e ações em destaque.
- A navbar responsiva acompanha a mesma largura dos blocos da tela, sem ocupar toda a horizontal.
- Sistema visual RN consistente no login, usuário, administração e SOGo.
- Leitor focado inspirado no Gmail, ocultando a lista imediatamente e sem piscar a antiga divisão da tela.
- Foto de perfil nativa com armazenamento local autenticado, recorte circular, arraste e zoom.
- Compositor refinado, sugestões mais claras e orientação honesta para endereços internos e externos.
- Marca centralizada na lateral, busca/listagem compactas e retorno direto das Preferências ao e-mail.
- Landmarks, link para pular conteúdo, labels, foco visível e suporte a movimento reduzido.
- Nome do produto, empresa, domínio padrão, logo e tela inicial do admin configuráveis.
- Instalador com backup prévio, validação e rollback protegido por checksum.
- Prévia isolada que usa somente dados de exemplo.
- CI, CodeQL, atualizações de dependências e verificação de segredos.

## Prévia

Sirva a raiz do repositório para carregar os assets relativos:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080/preview/`. A prévia é estática e não se conecta ao mailcow.

## Instalação rápida

```bash
git clone https://github.com/RubsNeto/rn-mail-theme.git
cd rn-mail-theme
cp config/rn-config.example.js config/rn-config.js
editor config/rn-config.js
sudo ./scripts/install.sh
```

O caminho padrão é `/opt/mailcow-dockerized`. Para outro ambiente:

```bash
sudo RN_MAIL_ROOT=/srv/mailcow \
  RN_MAIL_BACKUP_ROOT=/srv/backups/rn-mail-theme \
  RN_MAIL_CONFIG_FILE="$PWD/config/rn-config.js" \
  ./scripts/install.sh
```

O instalador para antes de qualquer alteração quando encontra um `docker-compose.override.yml` que não pertence ao projeto. Nesse caso, mescle primeiro os volumes SOGo de [`examples/docker-compose.override.yml`](examples/docker-compose.override.yml). Requisitos completos e checklist estão em [Instalação](docs/INSTALLATION.md).

## Configuração

As preferências locais ficam em `config/rn-config.js`, ignorado pelo Git:

```js
window.RN_MAIL_CONFIG = Object.freeze({
  brand: 'RN Mail',
  company: 'Example Company',
  defaultDomain: 'example.com',
  directoryLabel: 'Internal directory',
  logoUrl: '/img/rn-logo.png',
  adminDomainsLanding: true
});
```

Deixe `defaultDomain` vazio para exigir o e-mail completo. `directoryLabel` nomeia os destinatários internos confirmados no SOGo. Use `adminDomainsLanding: false` para manter a página inicial padrão do administrador. Consulte [Configuração](docs/CONFIGURATION.md) para trocar marca e personalizar o SOGo.

## Validar e reverter

O instalador informa o diretório do backup. Valide serviços locais e assets públicos com:

```bash
sudo RN_MAIL_URL=https://mail.example.com \
  ./scripts/validate.sh /opt/rn-mail-theme-backups/TIMESTAMP-v1.1.0
```

Restaure exatamente o estado anterior da interface com:

```bash
sudo ./scripts/rollback.sh /opt/rn-mail-theme-backups/TIMESTAMP-v1.1.0
```

O rollback verifica checksum e caminhos do arquivo, restaura os arquivos anteriores e remove somente arquivos do tema registrados como inexistentes antes da instalação.

## Estrutura

| Caminho | Finalidade |
| --- | --- |
| `src/mailcow/` | CSS, comportamento do mailcow e endpoint autenticado de foto do perfil. |
| `src/sogo/` | Tema e integração do SOGo. |
| `assets/` | Marcas RN e fontes servidas localmente. |
| `config/` | Exemplo seguro de configuração pública. |
| `scripts/` | Instalação, validação, rollback e auditorias. |
| `preview/` | Prévia estática da administração com domínios reservados. |
| `docs/` | Instalação, configuração, arquitetura e upgrades. |

Leia [Arquitetura](docs/ARCHITECTURE.md) para entender os limites da integração e [Upgrades](docs/UPGRADING.md) antes de mudar versões do mailcow ou SOGo.

## Compatibilidade e segurança

O tema depende da estrutura visual e dos caminhos de assets dos projetos upstream. Teste cada atualização do mailcow/SOGo em homologação. A CI verifica sintaxe e higiene do repositório, mas não reproduz todo ambiente possível.

Nunca publique `mailcow.conf`, certificados, `.env`, dumps, logs, dados de clientes ou `config/rn-config.js`. Vulnerabilidades devem ser relatadas de forma privada conforme [SECURITY.md](SECURITY.md).

## Contribuição e suporte

Contribuições são bem-vindas. Leia [CONTRIBUTING.md](CONTRIBUTING.md), siga o [Código de Conduta](CODE_OF_CONDUCT.md) e use [Discussions](https://github.com/RubsNeto/rn-mail-theme/discussions) para dúvidas. [SUPPORT.md](SUPPORT.md) indica o canal correto para cada assunto.

## Licenças e marcas

O código original voltado ao mailcow e as ferramentas do projeto usam GPL-3.0-only. Os arquivos derivados/de integração do SOGo usam GPL-2.0-only. As fontes mantêm OFL-1.1 e Apache-2.0. O mapa completo está em [NOTICE.md](NOTICE.md) e os textos em `LICENSES/`.

Os nomes e elementos visuais RN seguem termos separados em [TRADEMARKS.md](TRADEMARKS.md). Substitua-os ao publicar um derivado com outra marca.
