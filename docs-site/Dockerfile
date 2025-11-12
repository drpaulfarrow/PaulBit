FROM nginx:alpine

# Create directories
RUN mkdir -p /usr/share/nginx/html/docs-content/tests

# Copy documentation HTML
COPY index.html /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Note: Markdown files will be copied from parent directory during build
# This is handled by the build context in docker-compose

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

