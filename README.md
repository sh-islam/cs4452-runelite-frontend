# CS4452 website

The friends' website, published by GitHub Pages: home and news, how to use,
downloads (sign in, get your installer) and the admin panel. Plain HTML; no
build step. Edit a page, push, and it is live in a minute.

It holds nothing secret. Every sign-in, download and log goes to the backend
(`sh-islam/cs4452-runelite-backend`, running on the Tailscale server); its
address is the one line at the top of `site.js`.

- `index.html` -- home and news. Add an `<article>` at the top for each update.
- `howto.html` -- how to use. Fill it in as you like.
- `downloads.html` -- sign in and download the installer.
- `admin.html` -- the admin panel (friends, installs, their logs).
