FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# Install only what’s necessary
RUN apt-get update && \
    apt-get install -y ffmpeg nginx && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directory for HLS output
RUN mkdir -p /var/www/hls

# Expose HTTP port
EXPOSE 80

# Run Nginx and FFmpeg with optimized flags
CMD ["sh", "-c", "\
    nginx && \
    ffmpeg \
    -fflags nobuffer \
    -protocol_whitelist file,http,https,tcp,tls \
    -i http://145.239.19.149/6036/mono.m3u8 \
    -c:v copy \
    -c:a copy \
    -hls_time 0.5 \
    -hls_list_size 3 \
    -hls_flags delete_segments+append_list+omit_endlist \
    -f hls /var/www/hls/stream.m3u8"]
