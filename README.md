# 🌐 Serviço de Leitura de Imagens | image-reading-backend

Esta aplicação é um back-end de um serviço de leitura de imagens, contendo 3 três endpoints e uma integração com a API do Google Gemini.

## 🏗 Arquitetura

O sistema usa Node.js com TypeScript e Jest para testes, rodando em Docker junto a um banco PostgreSQL. Ele gerencia clientes e leituras de medidores (água/gás) utilizando a API do Google Gemini com validações e unicidade mensal. A arquitetura é modular, com variáveis de ambiente e volume persistente.

### 📌 Diagrama do Projeto  
![Diagrama do Projeto](src/assets/images/project_model.png)

---

## ℹ️ Informações sobre o Backend
1. Desenvolvido em Node.js com TypeScript, com arquitetura modular e organizada em camadas.
2. Utiliza Jest para testes automatizados, com cobertura configurada.
3. Integração com a Google Gemini API para leitura e interpretação das imagens enviadas.
4. Banco de dados PostgreSQL, com tabelas para clientes e leituras mensais de medidores (água/gás), garantindo unicidade por cliente, tipo e mês.
5. Contêineres Docker para app e banco, com volumes persistentes e variáveis de ambiente externas.]
6. Leitura de dados segue padrão UTC para consistência de horários.

---

Agora, clone o repositório:  

```bash
# Via SSH
git clone git@github.com:pedroiegler/image-reading-backend.git

# Via HTTPS
git clone https://github.com/pedroiegler/image-reading-backend.git
```

---

## ⚙️ Configuração

1️⃣ **Configure as variáveis de ambiente:**  
```bash
cp .env.example .env
```
> **Edite o arquivo `.env` conforme necessário.**

2️⃣ **Inicie os containers com Docker:**  
```bash
docker-compose up --build
```

---

### ⛁ Modelo do Banco de Dados
<img src="src/assets/images/database_model.png" alt="Modelo Completo" width="700">

---

## 📖 Documentação da API (Swagger)

A API possui uma documentação interativa gerada com **Swagger**, permitindo testar endpoints diretamente pelo navegador.

🔗 **Acesse a documentação:**  
```plaintext
http://localhost:80/docs/
```

---

## 🔧 Scripts úteis  

### ✅ Executar testes automatizados
```bash
docker-compose exec app npm test
```
ou
```bash
npm test
```

---

## 🛠 Tecnologias utilizadas  
- Node.js  
- TypeScript
- Google Gemini API
- PostgreSQL
- Docker & Docker Compose  
- Jest
- Swagger (OpenAPI)

---

## 📬 Contato  

Caso tenha dúvidas, entre em contato:  

📧 E-mail: [pedroiegler1601@outlook.com](mailto:pedroiegler1601@outlook.com)  

