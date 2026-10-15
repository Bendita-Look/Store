# Bendita Look - UI5

App UI5 (TypeScript, MVC) da loja Bendita Look, separado do backend [SAP-CAP-BenditaLook](https://github.com/DaviCastr/SAP-CAP-BenditaLook).

## Telas

| Rota | Acesso | Conteúdo |
|---|---|---|
| `#/` | Público | Vitrine com busca, filtro por categoria e faixa de promoções ativas |
| `#/product/{id}` | Público | Fotos por cor, seleção de cor/tamanho, estoque e adicionar ao carrinho |
| `#/cart` | Público | Carrinho (salvo no navegador), cupom, promoções aplicadas, entrega com CEP via ViaCEP ou retirada na loja; os dados de contato ficam lembrados no dispositivo |
| `#/order/{número}/{código}` | Público (link do email) | Acompanhamento do pedido |
| `#/login` | - | Login da área administrativa (XSUAA) |
| `#/admin/:aba:` | Role `Admin` | Pedidos (status, entrega, WhatsApp e registro de venda na loja), produtos, promoções e cupons, categorias, relatórios, configurações da loja e backup |
| `#/admin/product/{id}` | Role `Admin` | Editor do produto em draft: dados, cores, tamanhos/estoque e fotos |

## Estrutura

```
webapp/
  auth/          autenticação XSUAA (GitHub Pages) e mock (local)
  controller/    controllers das views; admin/ contém as seções da área administrativa
  model/         carrinho, formatters e modelos
  service/       pedidos, drafts, backup, upload/compressão de imagens
  util/          http, ambiente e tratamento de erros
  view/          views XML e fragments
  i18n/          textos
  config/        runtime-config.json (URLs do CAP e XSUAA)
```

São dois modelos OData V4: `catalog` (público, sempre carregado) e o modelo padrão do serviço admin, criado só após o login.

Os textos ficam em `i18n/i18n.properties` (português, padrão) e `i18n/i18n_en.properties` (inglês); o idioma segue o navegador. Nome, WhatsApp, email e Instagram da loja vêm do backend (`StoreInfo`), editáveis na aba Configurações.

As fotos são redimensionadas no navegador (máx. 1200px, JPEG) antes do upload.

## Desenvolvimento local

Com o CAP rodando em `http://localhost:4004`:

```bash
npm install
npm start          # http://localhost:8080/index.html
```

O proxy local (`custom-proxy`) encaminha `/api/service/...` e `/auth/...` para o CAP. Em ambiente local o login é simulado e o proxy envia o usuário de desenvolvimento do CAP (`basicAuth` em `ui5-local.yaml`) apenas para o serviço admin.

## Publicação (GitHub Pages)

1. Faça o deploy do CAP no BTP Trial (ver README do CAP).
2. Preencha `webapp/config/runtime-config.json` com a URL do serviço CAP e os dados do XSUAA (`authDomain`, `clientId`, `scope`), obtidos na service key do `BenditaLook-uaa`.
3. Faça push na `main`: o `mirror-store.yml` replica o código para `Bendita-Look/Store`, onde o `deploy.yml` gera o build e publica na branch `gh-pages`.
4. Em Settings > Pages do `Bendita-Look/Store`, selecione a branch `gh-pages`.

### Repositório oficial e espelho publicado

Este repositório é o oficial (onde se desenvolve), e a loja é publicada só pelo espelho `Bendita-Look/Store`, em `https://bendita-look.github.io/Store/`:

- `mirror-store.yml` roda apenas aqui e replica cada push na `main` para o primeiro espelho acessível da lista `BenditaLook/Store,Bendita-Look/Store` (variável `MIRROR_REPOSITORIES` para trocar), o que cobre a renomeação da organização. Alterações feitas direto no espelho são sobrescritas.
- `deploy.yml` roda apenas no espelho (`BenditaLook/Store` ou `Bendita-Look/Store`); aqui ele é ignorado, então este repositório não publica GitHub Pages.
- Secret `STORE_MIRROR_TOKEN`: token fine-grained com *Resource owner* a organização da loja (continua válido depois de renomeá-la), acesso só ao repositório `Store` e permissões *Contents* e *Workflows* de leitura e escrita.
- O login pela conta SAP volta para o próprio site em que foi iniciado: o `redirectUri` do `runtime-config.json` só é usado quando o usuário está naquele endereço; nos demais, vale a URL atual (que precisa estar nos redirect URIs do XSUAA).
