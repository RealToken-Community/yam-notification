# Project Realt Notification

This is a new community project aimed at sending alerts/notifications to users regarding various YAM offers, based on parameters chosen by each user.

Once notifications are enabled, you can configure the alerts you receive to only get what interests you (e.g., price changes, quantity, yield, etc.).

Currently, the project only works with Discord, but it may soon be compatible with Telegram.

Link to access the project : [Discord](https://discord.gg/Fexax4DYYc)

---

## TODO (for S2 2024)

- [ ] Switch programming language from JS to TS in entire project
- [ ] Enable modification of default notification settings from an admin area on Discord (currently managed via a JSON file and requires a server restart to apply changes)
- [ ] Add filtering option for tokens that people are whitelisted
- [ ] Develop a Telegram version of the bot using the same functions as the current bot for synergy
- [ ] Add an option in the notification settings to hide properties with hasTenants set to false (configurable per user)
- [x] Display the currency type of the offer in messages
- [ ] Make notifications configurable from a website with better UI/UX than Discord, enabling less experienced users to use the bot easily


## To run it locally (with Docker)

1. Clone the project.
2. Create a Discord bot via Discord Developer and grant it administrator access.
3. Create a private Discord server with a channel, as well as a role for alerts and two roles for languages (fr and en) which you will specify in the `.env` file.
4. Create a `.env` file following the model in the `.env.dist` file.
5. Start the project with the command `docker-service up --build`.

---

## Questions

If you have any questions, feel free to ask them on the project's Discord server.

