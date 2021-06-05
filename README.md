# Food-game K8s dashboard backend

This repository contains the files needed to deploy the backend part of the dashboard for the food-game K8s
It will be cloned by the Ansible playbook when the NVM is being created.

## Node application
This application is developed with Node.js and Express. It exposes (on port 5000) a simple REST API to check the number of pods of each service in the K8s project. Some of them have also the possibility of being scaled with another REST endpoint.

## K8s APIs
This application makes use of the [official K8s client](https://github.com/kubernetes-client/javascript). A file called `.env` contains all the necessary configuration to connect to the K8s cluster.

### Used API
This application, being only for demonstration purposes, uses the API related to the resources of type `deployment`. It fetches information about specific deployments and updates the number of pods for these deployments.