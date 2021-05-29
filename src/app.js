const express = require('express')
const app = express()
const port = 5000
const cors = require("cors")
const k8s = require('@kubernetes/client-node');
const https = require('https');
require('dotenv').config()
const serviceList = require('./services.json');

const kc = new k8s.KubeConfig();

const cluster = {
    name: process.env.K8S_CLUSTER_NAME,
    server: process.env.K8S_URL,
    caData: process.env.K8S_CADATA
};

const user = {
    name: process.env.K8S_USER,
    token: process.env.K8S_TOKEN,
};

const context = {
    name: process.env.K8S_CONTEXT,
    user: user.name,
    cluster: cluster.name,
};

kc.loadFromOptions({
    clusters: [cluster],
    users: [user],
    contexts: [context],
    currentContext: context.name,
});
const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sDeplApi = kc.makeApiClient(k8s.AppsV1Api);


app.use(cors());
app.options('*', cors());
app.use(express.json());

app.get('/users', (req, res) => {
    res.send([
        {
            nickname: "riccardo"
        },
        {
            nickname: "nicola"
        }
    ])
})

app.get("/recipes", async (req, res) => {
    await k8sDeplApi.readNamespacedDeployment("adminer", "food-app").then(response => {
        console.log(response);
    });
    res.send([
        {
            name: "Carbonara"
        },
        {
            name: "Pasta al pomodoro"
        },
        {
            name: "Pizza"
        }
    ])
})

app.get("/appStatus", async (req, res) => {
    // todo get k8s status, namespace name get from env
    /*await k8sCoreApi.readNamespace("food-app").then((response) => {
    });*/
    // con questo ottengo informazioni sul singolo deployment: body.status.availableReplicas / body.status.availableReplicas

    let status = "ok";
    let msg = null;
    // todo get from global
    /*const serviceList = [{
        slug: "adminer",
        name: "Adminer test",
        status: "ko",
        scalable: true,
        activePods: 0,
        desiredPods: 0
    }];*/
    try {
        await Promise.all(serviceList.map(async service => {
            await k8sDeplApi.readNamespacedDeployment(service.slug, "food-app").then(response => {
                service.activePods = response.body.status.availableReplicas;
                service.desiredPods = response.body.status.replicas;
                if (response.body.status.availableReplicas == response.body.status.replicas) {
                    service.status = "ok";
                } else {
                    service.status = "ko";
                }

                if (service.status === "ko") {
                    status = "ko";
                }
            })
        }))
        if (status === "ko") {
            msg = "The number of pods is not the same as the desired. It's possible that the application is still scaling"
        }
        res.send({
            status: status,
            services: serviceList,
            msg: msg
        })
        
    } catch(e) {
        res.send({
            status: "ko",
            msg: "The Kubernetes cluster is not available or the services are not deployed correctly",
            services: serviceList
        });
        console.log(e);
    }
    /*await k8sDeplApi.readNamespacedDeployment("adminer", "food-app").then(response => {
        res.send({
            status: "ok",
            services: [
                {
                    slug: "frotend",
                    name: "Angular frontend",
                    status: "ok",
                    scalable: true,
                    activePods: 1,
                    desiredPods: 5,
                },
                {
                    slug: "frotend-rest-api",
                    name: "Frontend rest API",
                    status: "ok",
                    scalable: false,
                    activePods: 1,
                    desiredPods: 1,
                },
                {
                    slug: "match-service",
                    name: "Match service",
                    status: "ko",
                    scalable: true,
                    activePods: 1,
                    desiredPods: 5,
                },
                {
                    slug: "recipes-db-adapter",
                    name: "Recipes db adapter",
                    status: "ok",
                    scalable: true,
                    activePods: 5,
                    desiredPods: 5,
                },
                {
                    slug: "users-db-adapter",
                    name: "Users db adapter",
                    status: "ko",
                    scalable: true,
                    activePods: 2,
                    desiredPods: 2,
                },
                {
                    slug: "recipes-db",
                    name: "Recipes db",
                    status: "ok",
                    scalable: false,
                    activePods: 1,
                    desiredPods: 1,
                },
                {
                    slug: "users-db",
                    name: "Users db",
                    status: "ok",
                    scalable: false,
                    activePods: 1,
                    desiredPods: 1,
                },
            ],
            k8s: response
        })
    });*/
    
})

app.post("/appstatus", async (req, res) => {
    const body = req.body;
    if (body.slug) { // todo validare slug
        if (body.desiredPods > 0) {
            // todo api kubernetes edit deployment, DEPL NAME from slug

            const k8sQuery = await k8sDeplApi.readNamespacedDeployment(body.slug, "food-app");
            let deployment = k8sQuery.body;

            deployment.spec.replicas = parseInt(body.desiredPods);

            await k8sDeplApi.replaceNamespacedDeployment("adminer", "food-app", deployment);

            res.send("ok");
        }
    }
})

app.listen(port, async () => {
    console.log(`Example app listening at http://localhost:${port}`);
})
