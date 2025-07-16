import admin from "firebase-admin";

// Aquí mismo puedes copiar el JSON de la clave privada:
const serviceAccount = {
  type: "service_account",
  project_id: "gymapp-2730f",
  private_key_id: "be6ac6859fb27b1081ad552ef47c9d8eb3029240",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCjGHssWm6RKWnq\niUgt3FQkldhoYXk/81AxtpQZ+u0HXMGd6PFh1nQ69TU0JqP4gPyRFq0PxyWEWiml\n/GvyWQ+LN041QIMkpR+pc0LxpLqeHBZ7rRW4hH5TWicP0ft/fvxHX8NMrCsljgBX\nfOzXjqoDBumbJtdliy38XVP61bRJJ5DOUh/BtmnNCW9JIu0mKRRO2dp6jgvB4JQl\nHsLjlNEHAbo4HC4Xpgs4DagL+L2NeMyWL4qk/SN82hanRhS4ZED/1ei0vwKRqPJP\nT97j+LtfeXDwjpaUVEOhloLhxSKL0lQMyLMFSIt2vHdXxZBnsfdVZFxblG9ZOmVe\nAioneYffAgMBAAECggEABOa78OHI19jwQ2mbvzETYEQWjFB9ldPokY3kloFJdUKu\n2OGCu4d317u9vRL6M4Ig1PVi/wnjkT4qaUAUOGS/yFXBpm0JY+UIdg2uMdfa+dxr\nOo1BjVmB+FxJtzp+vd6hkz2H/3pfE5JYZUiuT24MoummxJBewcD0gVSGrQ+WCuq2\nsW34wOjRaSV2YF67C1N4/wiHxjCAcFbwZRSdQskcev3NXHop28HXsFU9bGV5vZQx\nlgTDssrmka43Ph2NoHhTE/h3Nv3WB5JXigzjLbF+sHK/KuDRTpHJ1VwWkJPVC+PZ\nxIpHYhdZmp0vST6TvdLI2Pyvn9RRnZN7Oh8RWhvAhQKBgQDPe3QUFVImy7+hKfkq\n9V9VQS2h2iQ9GxOQuEVMJAQB+VLkESB6ImYvpslAbk8voWjOYLAFu6vd2sCmsopp\niSmRmjZuRVE7UxangvYq/YrgVaCr9Jmq/dIBG1amfCz5rDcI7aNEd8JgaWefWFx9\nTzmh6Uivj5ywrK2le6ueL+lUSwKBgQDJO+dyDMOgiClOgD708PbwL5g6nN4wjH7M\ncK7JCkHPXXSPBAPIgWi+fl0ysgSGLlypPO0yK5h0i9XbRzu8FEOlzg7ZU+5T9lFq\nqGt7Bbt4Y6w8SqmzlIv0xpnRhZVZU/Q+6uMmn+Lil3cKw9TU6XpkI9VntY2fGhy6\n/xc/taYWPQKBgQC3hDt81Arw08CwnT6Nt7DV6KujAB6TidJ5a/OnUCfXUx71KQzv\n2mNF/KD/g1I5D+xytmSa/Y8b0TQbfcodZLvG1H8Wc+tQrMJZ8eUoy0+98x8FWXle\nG9lXL0YqRaVGRQP8uqxxj/f2bOTBtVdBYwTX6E5pMn5maqXAvC1k4n3gFwKBgGH/\n1lrodGy9YsBkHETVBK07wHrq4hnqkeWmCrjFUf9Wl+j+H4mJ3CTJDUIfB60A7wdM\nMId6S6iWYPOE4UZa6AbbLsgP48Tn9AZpNs6WoBGlGL/T7IkUEoSGI2qyD2WNSSlK\n4oxw2OFYuhR4AjId8gjKmqcC95E/+jXm/L9+CwBRAoGAeWiuTg4A+67DpbdiDUuv\nQt3K+Rc8idO56i9H5h/Mu31ObMUrn7uGpv9zCMDrwQynLYP3frEscfMJiB/HV4dw\nMebGFyop7VSvBeOJqzjDBXlj80Y419rhQiA8R6XxHyHlzQaAollbW3w5tOZDxe2X\nz15eucTC2z4JoEsNmorZapM=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@gymapp-2730f.iam.gserviceaccount.com",
  client_id: "115191946613403404480",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gymapp-2730f.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const registrationTokens = [
  "e6QFD--hT6i4qHh6F5mESb:APA91bE1HYyl2r0XebGMtPr9tdGtgOggR2m8MMEZPsDs3LJzruLj7P35Ovsd0YdAoQuKY-CrZ3sfdputSJfWckwQQLPbhI_fJmcv5qdHE2NzrWmN3vVZeEg",
  // Agrega aquí más tokens válidos
];

const message = {
  notification: {
    title: "Prueba Multicast",
    body: "Este es un mensaje enviado a varios dispositivos",
  },
  tokens: registrationTokens,
};

admin
  .messaging()
  .sendEachForMulticast(message)
  .then((response) => {
    console.log(`${response.successCount} mensajes enviados correctamente`);
    if (response.failureCount > 0) {
      console.log("Errores:");
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(
            `Token: ${registrationTokens[idx]}, Error: ${resp.error}`
          );
        }
      });
    }
  })
  .catch((error) => {
    console.error("Error enviando mensajes:", error);
  });
