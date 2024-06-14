module.exports = {
    apps: [{
        name: "realtNotification",
        script: "npm",
        args: "run discord",
        watch: true,
        ignore_watch: ["node_modules", "*.log", "json/*.json"]
    }]
};
