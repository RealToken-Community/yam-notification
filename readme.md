# Project Realt Notification

This is a new community project aimed at sending alerts/notifications to users regarding various YAM offers, based on parameters chosen by each user.

Once notifications are enabled, you can configure the alerts you receive to only get what interests you (e.g., price changes, quantity, yield, etc.).

Currently, the project only works with Discord, but it may soon be compatible with Telegram.

Link to access the project : [Discord](https://discord.gg/Fexax4DYYc)

---

## To run it locally (with Docker)

1. Clone the project.
2. Create a Discord bot via Discord Developer and grant it administrator access.
3. Create a private Discord server with a channel, as well as a role for alerts and two roles for languages (fr and en) which you will specify in the `.env` file.
4. Create a `.env` file following the model in the `.env.dist` file.
5. Start the project with the command `docker-service up --build`.

---

## Questions

If you have any questions, feel free to ask them on the project's Discord server.

