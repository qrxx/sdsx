FROM ubuntu:20.04
# Set non-interactive installation to avoid prompts
ENV DEBIAN_FRONTEND=noninteractive
# Install FFmpeg and Nginx
RUN apt-get update && apt-get install -y ffmpeg nginx && apt-get clean
# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
# Create directory for HLS output
RUN mkdir -p /var/www/hls
# Expose port 80
EXPOSE 80
# Run Nginx and FFmpeg
CMD ["sh", "-c", "nginx && ffmpeg -fflags nobuffer -rtsp_transport tcp -max_delay 500000 -i rtsp://146.59.54.160/10 -c:v copy -c:a copy -hls_time 1 -hls_list_size 5 -hls_flags delete_segments+append_list -f hls /var/www/hls/stream.m3u8"]
