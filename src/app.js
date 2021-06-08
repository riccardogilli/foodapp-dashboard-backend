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

/*app.get('/users', (req, res) => {
    res.send([
        {
            nickname: "riccardo"
        },
        {
            nickname: "nicola"
        }
    ])
})*/

/* app.get("/recipes", async (req, res) => {
    await k8sDeplApi.readNamespacedDeployment("adminer", process.env.K8S_NAMESPACE).then(response => {
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
}) */

app.get("/appStatus", async (req, res) => {
    let status = "ok";
    let msg = null;
    try {
        await Promise.all(serviceList.map(async service => {
            await k8sDeplApi.readNamespacedDeployment(service.slug, process.env.K8S_NAMESPACE).then(response => {
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
            services: []
        });
        console.log(e);
    }
})

app.post("/appstatus", async (req, res) => {
    const body = req.body;
    if (body.slug) { // todo validare slug
        if (body.desiredPods > 0) {
            // todo api kubernetes edit deployment, DEPL NAME from slug

            const k8sQuery = await k8sDeplApi.readNamespacedDeployment(body.slug, process.env.K8S_NAMESPACE);
            let deployment = k8sQuery.body;

            deployment.spec.replicas = parseInt(body.desiredPods);

            await k8sDeplApi.replaceNamespacedDeployment(body.slug, process.env.K8S_NAMESPACE, deployment);

            res.send("ok");
        }
    }
})

app.listen(port, async () => {
    console.log(`Example app listening at http://localhost:${port}`);
})
