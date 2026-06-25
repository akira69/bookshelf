# m4b-tool

This folder contains the bundled `m4b-tool.phar` used when Bookshelf's M4B
conversion path is left as `m4b-tool` and the packaged PHAR is present under
`Tools/m4b-tool`.

`m4b-tool` is distributed under the MIT license. Its runtime dependencies are
not bundled here; install PHP, FFmpeg/FFprobe, and mp4v2/mp4chaps on the host or
container image.

The bundled PHAR is from:

https://github.com/sandreas/m4b-tool/releases/download/v.0.4.2/m4b-tool.phar
