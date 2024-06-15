# Projet Realt Notification

C'est un nouveau projet communautaire ayant pour vocation d'envoyer des alertes/notifications aux utilisateurs concernant les différentes offres du YAM, en fonction des paramètres choisis par chaque utilisateur.

Une fois les notifications activées, vous pourrez paramétrer les alertes que vous recevez afin de ne recevoir que ce qui vous intéresse (ex : variation de prix, quantité, etc.).

Pour l'instant, le projet fonctionne uniquement avec Discord, mais il pourra dans un avenir proche fonctionner avec Telegram.

Lien pour accéder au projet : [Discord](https://discord.gg/Fexax4DYYc)

---

## Pour le faire fonctionner en local

*Note : une image Docker sera bientôt disponible.*

1. Installer Node.js sur votre machine.
2. Cloner le projet.
3. Exécuter la commande `npm i` pour installer les dépendances.
4. Créer un bot Discord via Discord Developer en lui donnant les accès administrateur.
5. Créer un serveur Discord privé avec un channel dédié aux messages du bot et un channel dédié aux commandes et un role alert que vous allez indiquer dans le fichier `.env`.
6. Créer une base de données MySQL et y importer le contenu du fichier `dump.sql`.
7. Créer un fichier `.env` en suivant le modèle du fichier `.env.dist`.
8. Démarrer le projet avec la commande `npm run discord` ou utiliser PM2 avec `pm2 start system.config.cjs`.

---

## Questions

Si vous avez des questions, n'hésitez pas à les poser sur le serveur Discord du projet.

