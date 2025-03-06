# Create an ovh setup if your company does not have it

**Improba has such a setup, you may skip this step**.

1. Using OVH, create a projet in the public cloud tab. 
2. Create a docker registry (harbor), note the access codes
3. Create a database instance and create a db for your project plus a user. Note the user access codes. Open pgAdmin and connect to the db as avadmin (ovh admin) allow the app db user to have create/write/read access to the schema/public within the db. This is mandatory with last postgresql version.

4. Create a small cluster to install Rancher
5. Install Lens on you computed (desktop app)
6. Using the OVH UI, copy the .kubeconfig file associated with you cluster and paste it into the new cluster yml prompt of Lens
7. Connect to your cluster using Lens
8. Using The helm package manager, install the Traefik Ingress Controller
8. Open a terminal prompt and run the following command to install Rancher on your cluster:
```bash
# Install cert-manager
helm repo add jetstack https://charts.jetstack.io 
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.12.0 --set installCRDs=true
# Install rancher and fill the <HOSTNAME> with your rancher url and <PWD> with your admin password
# Using the rancher ui, create a namespace named "cattle-system"
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm install rancher rancher-stable/rancher --set ingress.tls.source=letsEncrypt --namespace cattle-system --set hostname=<HOSTNAME> --set bootstrapPassword=<PWD>
```

# Install a new cluster to deploy an app in production

1. Connect and login to your rancher app and clic on "add new cluster". Give the new cluster a name and press "next", you will land on page with command to run on the new cluster. 

2. On ovh, create a new cluster and copy its kubeconfig file. Paste it in Lens so you can access your brand new cluster.

3. Within the cluster, run commands displayed on rancher (the first one should be enough) then the following:
```bash
# Install cert manager on the new cluster
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.12.0 --set installCRDs=true
```

4. Install and ingress controller (nginx) using the helm chart. Get its External ip (service/controllers) and create a DNS entry for it (A record).

5. Create cluster issuers for staging and prod using the yml files joined. You can also paste the content into rancher interface (import yml button, top right), for
[prod](issuer-lets-encrypt-prod.yml) and [staging](issuer-lets-encrypt-staging.yml). Staging issuer can be used for testing purposes since the number of trials is limited with the prod one.

6. Create a secret to register your docker registry. Create a resource using the UI:
storage/Secrets -> new -> docker registry

7. **Deploy your app**. 
  - First ensure all the venv listed in [bitbucket-pipelines.yml](../bitbucket-pipelines.yml) are defined in the Staging deployment environnement of bitbucket. And the pipelines enabled for your repo.
  - Double check the values of the DB and of the registry (you may have to create a project and harbor to get a path)
  - If you use pgadmin4 to connect to the db, you may have to add the public schema to the db user. Once you created a database using OVH, you will need to connect to it and to add the public schema to the db user. This is mandatory with last postgresql version.
  - For each api and front; create a deployment in Rancher by manually putting a link to your image in harbor (front or api), select resources (cpu, ram)
  - Using the API UI (top righ, drop down menu, API KEYS) identify your project ID and deployement name (these are within the access URL)
  - Create an API key and register its **Bearer token**, you will use it to authenticate. Note **the key must not have a scope** or it will not be able to perform GET and PATCH operation on deployments. It is required in bitbucket pipelines venv.
  - Check the deployment is working correctly by looking at the logs of the pods (top right, drop down menu, pods). do not forget to add venv to the api deployment : db access, jwt_secret etc. These are the values of the .env file of api.

8. Create an Ingress, it must have the following annotation so lets encrypt can work its magic:
```yml
acme.cert-manager.io/http01-edit-in-place: 'true'
cert-manager.io/cluster-issuer: letsencrypt-production # (the name of prod cluster issuer)
nginx.org/client-max-body-size: 10000m # 10 Gb max upload body (nginx level), you may increase it

```
- It must also have a tls:host: entry in its yml (it will create the cert)
```yml
  tls:
    - hosts:
        - template-monorepo-api.improba.eu # The domain name of your app
      secretName: template-monorepo-improba-api.cert # Just a name, it will be created
```
 => The saving of the ingress will trigger the certificate creation+challenge. And the app should be online! 



