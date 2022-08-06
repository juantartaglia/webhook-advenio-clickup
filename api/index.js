'use strict'

const request = require('request');
const fastify = require('fastify');
const nodemailer = require('nodemailer');
const MailGen = require('mailgen');

const pk = process.env.TOKEN;
const team_id = process.env.TEAM_ID;
const webhookEndpoint = process.env.WEBHOOK_ENDPOINT
const space_id = process.env.SPACE_ID;
const webhookId = process.env.WEBHOOK_ID;
const clientId=process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const code = process.env.CODE;
const list_id = 9404877;
const list_id_registration = 9536539;

const custom_fields = [
  {
      id: "076ae7ec-1a3d-4e64-b1e0-bdfcda79b4c1",
      name: "Attachments"
  },
  {
      id: "8fa2eba7-28f5-4c8e-aeff-a3b4f407c7d9",
      name: "Customer",
  },
  {
      id: "7abc9c82-881f-4fae-a2c1-3172f9d356b4",
      name: "Description",
  },
  {
      id: "3c452ac1-d5bb-4b14-94e8-edc8a31a51bb",
      name: "Email",
  },
  {
      id: "b3533f08-3c44-4028-9eb6-d3dfbcc35dbc",
      name: "Type",
  },
  {
      id: "560a969e-0015-4d73-988f-0955516ae218",
      name: "User Name",
  },
  {
      id: "adb91aba-8ff5-4008-9a79-a210dce149d1",
      name: "Subject",
  }
]

function build () {
  const app = fastify({
    logger: false
  })
  app.register(require('fastify-multipart'), { attachFieldsToBody: true })
  
  app.get('/', async (req, res) => {
    return `OK`;
  });

  app.get('/test', async (req, res) => {
    let error = null;
    try {
        let mail = await sendEmail({from:process.env.MAILER_SMTP_USER,to:"soporte@advenio.com.ar",subject:"Test - webhook",html:"<p>Test</p>"});
    }
    catch(err){
        console.log("Error : ", err)
        error = err;
    }
    finally{
      return error? { status: "Error", detail: error } : { status: "OK"};
    }
  })

  app.post('/webhook/taskCreated', async (request, reply) => {
    await webhookHandler(request.body, "TaskCreated") 
    return 'OK'
  })

  app.post('/webhook/taskStatusChanged', async (request, reply) => {
    await webhookHandler(request.body, "TaskStatusChanged") 
    return 'OK'
  })

  app.get('/getTask/:task_id',async  (request, reply) => {
    let task = await getTask(request.params.task_id);
    return task;
  })

  app.get('/getTask/:task_id/comments',async  (request, reply) => {
    let task = await getComments(request.params.task_id);
    return task;
  })

const commentSchema = {
  body: {
    type: 'object',
    required: ['comment'],
    properties: {
      comment: { type: 'string' },
    } 
  }
}


app.post('/newComment/:task_id',async (request, reply)=> {
  let task_id = request.params.task_id;
  let body = { comment_text: request.body.comment };
  let result = await get(`https://api.clickup.com/api/v2/task/${task_id}/comment`,"POST", JSON.stringify(body))
  return result;
})


const newTaskSchema = {
  body: {
    type: 'object',
    required: ['email','customer', 'subject', 'description'],
    properties: {
        email: { type: 'string'},
        customer: { type: 'string'},
        subject: { type: 'string'},
        phone: { type: 'string'},
        attachment: { type: 'string'},
        description: { type: 'string'}
    }
  }
}

app.post('/newRegistration', async (request, reply)=> {
  let razonSocial = request.body.razonSocial.value || "";
  let nroCUIT = request.body.nroCUIT.value || "";
  let tipoIVA = request.body.tipoIVA.value || "";
  let domicilioFacturacion = request.body.domicilioFacturacion.value || "";
  let telContacto = request.body.telContacto.value || "n/a";
  let emailContacto = request.body.emailContacto.value || "";
  let webPage = request.body.webPage.value || "";
  let profesional = request.body.profesional ? await JSON.parse(request.body.profesional.value) : {};
  let profApellido = profesional.apellido ? profesional.apellido || "" : "";
  let profNombre = profesional.nombre ? profesional.nombre || "": "";
  let profTelefono = profesional.telefono ? profesional.telefono || "" : "";
  let profMatricula = profesional.nroMatricula ? profesional.nroMatricula || "" : "" + profesional.nroMatricula ? profesional.nroMatricula || "" : "";
  let profEspecialidad = profesional.especialidad ? profesional.especialidad || "" : "";
  let profDNI = profesional.dni ? profesional.dni || "" : "";
  let profDomicilio = profesional.domicilioAtencion ? profesional.domicilioAtencion || "" : "";
  let profHorarios = profesional.horarioAtencion ? profesional.horarioAtencion || "" : "";
  let profEmail = profesional.email ? profesional.email || "n/a" : "n/a";
  let secretarias = request.body.secretarias ? await JSON.parse(request.body.secretarias.value) : [];
  let observaciones = request.body.observaciones.value || "n/a";
  let instalacion = 'Instalación '+razonSocial;
  let description = `**Instalación ${razonSocial}, CUIT: ${nroCUIT}.**\n`;
  description+=`\n\n`;
  description+=`Datos Comerciales\n`;
  description+=`Razón Social : **${razonSocial}**\n`;
  description+=`Nro. CUIT : **${nroCUIT}**\n`;
  description+=`Tipo IVA : **${tipoIVA}**\n`;
  description+=`Domicilio Facturación : **${domicilioFacturacion}**\n`;
  description+=`Tel. Contacto : **${telContacto}**\n`;
  description+=`Email Contacto : **${emailContacto}**\n`;
  description+=`Página Web : **${webPage}**\n`;
  description+=`Observaciones : **${observaciones}**\n`;
  description+=`\n\n`;
  description+=`Profesional :\n`;
  description+=`Apellido : **${profApellido}**\n`;
  description+=`Nombre : **${profNombre}**\n`;
  description+=`Teléfono : **${profTelefono}**\n`;
  description+=`Matrícula : **${profMatricula}**\n`;
  description+=`Especialidad : **${profEspecialidad}**\n`;
  description+=`Nro. DNI : **${profDNI}**\n`;
  description+=`Email : **${profEmail}**\n`;
  description+=`Domicilio Atención : **${profDomicilio}**\n`;
  description+=`Horarios de Atención : **${profHorarios}**\n`;
  description+=`\n\n`;
  secretarias.map(sec => {
    description+=`Secretaria :\n`;
    description+=`Apellido : **${sec.apellido ? sec.apellido : "n/a" }**\n`;
    description+=`Nombre : **${sec.nombre ? sec.nombre : "n/a" }**\n`;
    description+=`Nro. DNI : **${sec.dni ? sec.dni : "n/a"}**\n`;
    description+=`Email : **${sec.email ? sec.email : "n/a"}**\n`;
    description+=`\n`
  });
  let body = {
    name: instalacion,
    markdown_description: description,
    assignees: [],
    tags: ['Instalación'],
    priority: null,
    notify_all: true,
    parent: null,
    links_to: null
  }
  try{
    let result = await get(`https://api.clickup.com/api/v2/list/${list_id_registration}/task/`,'POST',JSON.stringify(body));
    let resultBody = JSON.parse(result.body);
    let task_id = resultBody.id;
    if(result.response.statusCode == 200 && request.body.file ) {
      try {
        let fileBuffer = await request.body.file.toBuffer();
        let filename = request.body.file.filename;
        let result = await sendAttachment(task_id, fileBuffer, filename);
    } catch(e) {
      console.log("Error llamando a attach ", e)
    }
  }
  return result;
}
catch (e){
  console.log("Error on new registration : ", e);
  return null;
}
})



app.post('/newTask', async (request, reply)=> {
  //console.log(request.body.file ? "Con Archivo": "Sin Archivo")
  let name = request.body.name.value || "";
  let email = request.body.email.value || "";
  let business = request.body.business.value || "";
  let subject = request.body.subject.value || "";
  let description = request.body.description.value || "";
  let type = request.body.type.value || "";
  //console.log({name, email, business, subject, description, type})
  let customerId = custom_fields.filter(e => e.name === 'Customer');
  let emailId= custom_fields.filter(e => e.name === 'Email');
  let typeId= custom_fields.filter(e => e.name === 'Type');
  let usernameId= custom_fields.filter(e => e.name === 'User Name');
  //console.log("Customer Id", customerId[0].id, emailId[0].id, usernameId[0].id);
  let custom = [{id: customerId[0].id, value: business},
    {id: emailId[0].id, value: email},
    {id: usernameId[0].id, value: name},
    {id: typeId[0].id, value: type}
  ];
  let body = {
    name: subject,
    description: description,
    assignees: [],
    tags: [type, business],
    priority: 3,
    notify_all: true,
    parent: null,
    links_to: null,
    custom_fields: custom
  }
  try{
    let result = await get(`https://api.clickup.com/api/v2/list/${list_id}/task/`,'POST',JSON.stringify(body));
    let resultBody = JSON.parse(result.body);
    let task_id = resultBody.id;
    //console.log("Result New Task ", JSON.parse(result.body));
    //console.log("New Task : ", task_id)
    if(result.response.statusCode == 200 && request.body.file ) {
      //let fileRaw = await request.body.file.toBuffer();
      try {
        let fileBuffer = await request.body.file.toBuffer();
        let filename = request.body.file.filename;
        let result = await sendAttachment(task_id, fileBuffer, filename);
        //console.log(result);
    } catch(e) {
      console.log("Error llamando a attach ", e)
    }
  }
  return result;
}
catch (e){
  console.log("Error on new task : ", e);
  return null;
}
})


app.get('/status',async  (request, reply) => {
    let status = await getWebhookStatus(webhookId);
    return status;
})

  return app
}

module.exports = build

async function webhookHandler(webhook, event){
  console.log("****************   webhook  ************************")
  console.log(webhook);
  let { payload } = webhook;
  try {
    let {id, name, custom_fields } = payload;
    console.log("Enviar mail ",event ,task_id);
    let email = custom_fields.filter(e => e.name === 'Email');
    let username = custom_fields.filter(e => e.name === 'User Name');
    let business = custom_fields.filter(e => e.name === 'Customer');
    if (email[0] && email[0].value != '') {
      let mail = await generateEmail(name, id, username[0].value );
      let copyAddress = await getCopyAddress(business[0].value);
      let sendMail =await sendEmail({ from: process.env.MAILER_SMTP_USER, to: email[0].value,cc: copyAddress , subject:"Notificación", html: mail })
    }
  } catch(e){
    console.log("Error on GetTask Webhook", e)
  }
}

async function getCopyAddress(business){
  const config = require('./profiles.json')
  let address = config.profiles.filter(e => e.business == business);
  return  address[0]? address[0].defaultEmail: "";
}


async function generateEmail(name, task_id, username){
  const mailGenerator = new MailGen({
      theme: 'salted',
      product: {
        name: 'Medere',
        link: 'https://www.medere.com.ar',
        logo: "https://medere.com.ar/img/medere_logo.png",
        copyright: 'Copyright © 2020. Advenio Software.',
      },
  })
  
  const email = {
    body: {
      greeting: 'Hola ',
      signature: 'Sincerely',
      signature: false,
      //title: ''
      name: username,
      intro: `Tu ticket "${name}", ha cambiado de estado`,
      action: {
        instructions: 'Para ver el estado del mismo, hacé click en el boton de Seguimiento',
        button: {
          color: '#33b5e5',
          text: 'Seguimiento',
          link: `https://advenio-helpdesk.vercel.app/status/?taskId=${task_id}`,
        },
      },
    },
  }
  const emailTemplate = mailGenerator.generate(email)
  return emailTemplate;
}



async function sendEmail({ from, to, cc,subject, html }) {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        auth: {
            user: process.env.MAILER_SMTP_USER,
            pass: process.env.MAILER_SMTP_PASSWORD
        } 
    });
    await transporter.sendMail({ from, to,cc ,subject, html });
}


const get = async (url,method, body) => {
    return new Promise((resolve,reject) => {
        request({
            method: method,
            url: url,
            body: body,
            headers: {
              'Authorization': pk,
              'Content-Type': 'application/json'
            }},(error, response, body)=>{
            if(error) return reject(error);
            return resolve({body, response})
        })
    })
}


const sendAttachment = async (task_id, fileRaw, filename) => {
  let url = `https://api.clickup.com/api/v2/task/${task_id}/attachment`;
  const FormData = require('form-data');
  const form = new FormData();
  form.append('attachment', fileRaw, filename);
  const headers = form.getHeaders();
  headers.authorization = pk;
  return new Promise((resolve,reject) => {
      request({
          method: 'POST',
          url: url,
          body: form,
          headers: headers},(error, response, body)=>{
          if(error) return reject(error);
          return resolve({body, response})
      })
  })
}

async function getAuthToken() {
    request({
        method: 'POST',
        url: `https://api.clickup.com/api/v2/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`,
      }, function (error, response, body) {
        console.log('Status:', response.statusCode);
        console.log('Headers:', JSON.stringify(response.headers));
        console.log('Response:', body);
      });
}


async function getTask(task_id) {
    let url = `https://api.clickup.com/api/v2/task/${task_id}/`;
    let { body } = await get(url,"GET", '');
    return await JSON.parse(body);
}

async function getComments(task_id){
    let url = `https://api.clickup.com/api/v2/task/${task_id}/comment`;
    let { body } = await get(url,"GET", '');
    return await JSON.parse(body);
}


async function getWebhooks(){
    let url = `https://api.clickup.com/api/v2/team/${team_id}/webhook`
    let { body } = await get(url,"GET", '');
    let result = JSON.parse(body); 
    return result;
}


async function deleteWebhook(webhookId) {
    let url = `https://api.clickup.com/api/v2/webhook/${webhookId}`
    let { body, response } = await get(url,"DELETE", '');
    return response.statusCode == 200 ? true : false;
}


async function createWebhook(space_id, endpoint){
    let url= `https://api.clickup.com/api/v2/team/${team_id}/webhook`;
    let bodyRequest = { endpoint: " https://e9b2bb3a71ec.ngrok.io/webhook", events: ["taskCreated", "taskStatusUpdated", "taskCommentPosted"], space_id : "3081237"}
    let { body } = await get(url,"POST", JSON.stringify(bodyRequest));
    console.log(JSON.parse(body))
}

async function getWebhookStatus(webhookId){
    let {webhooks} = await getWebhooks();
    let filtered = webhooks.filter(el => el.id === webhookId);
    return { webhookId: webhookId,health: filtered.length != 0 ? filtered[0].health : false}
}

