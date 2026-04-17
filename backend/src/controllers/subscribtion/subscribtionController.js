const getSubscribtion = (req, res) => {
    res.status(200).json({ message: "Get my subscription" });
}

const subscribePlan = (req, res) => {
    res.status(200).json({ message: "Subscribe to a plan" });
}

const unsubscribePlan = (req, res) => {
    res.status(200).json({ message: "Unsubscribe from a plan" });
}

const changePlan = (req, res) => {
    res.status(200).json({ message: "Upgrade/Downgrade plan" });
}

export {
    getSubscribtion,
    subscribePlan,
    unsubscribePlan,
    changePlan
}