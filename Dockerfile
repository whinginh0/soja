# Usar Nginx para servir arquivos estáticos
FROM nginx:alpine

# Copiar a configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar a página de vendas para a raiz do servidor web
COPY paginadevendas/ /usr/share/nginx/html/

# Copiar os arquivos da área de membros para o subdiretório correspondente
COPY areademembros/ /usr/share/nginx/html/areademembros/

# Expor a porta 80
EXPOSE 80
