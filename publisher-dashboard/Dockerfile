FROM nginx:alpine

ARG NGINX_CONFIG=nginx.conf
COPY dist /usr/share/nginx/html
COPY ${NGINX_CONFIG} /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
