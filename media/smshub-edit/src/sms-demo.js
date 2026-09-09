const now=Date.now();
const ago=m=>new Date(now-m*60000).toISOString();
const numbers=['+79991234567','+79992345678','+79993456789','+79994567890','+79995678901','+79996789012'];
const sms=[
  {phone:'+79991234567',sender:'Telegram',message:'Код для входа: 48213. Никому его не сообщайте.',received_at:ago(0)},
  {phone:'+79992345678',sender:'Avito',message:'Ваш код подтверждения: 7742',received_at:ago(3)},
  {phone:'+79991234567',sender:'SBER',message:'Код 9051 для входа в приложение. Не сообщайте его никому.',received_at:ago(12)},
  {phone:'+79993456789',sender:'WhatsApp',message:'Your WhatsApp code: 366-812',received_at:ago(27)},
  {phone:'+79994567890',sender:'OZON',message:'Код для входа 5518. Действует 5 минут.',received_at:ago(48)},
  {phone:'+79992345678',sender:'Yandex',message:'Ваш одноразовый пароль: 220497',received_at:ago(96)},
  {phone:'+79995678901',sender:'VK',message:'Код подтверждения: 81 44 30',received_at:ago(150)},
  {phone:'+79996789012',sender:'Wildberries',message:'Код для входа: 6390',received_at:ago(210)}
];
const orders=[
  {id:'ord_1042',qty:3,status:'done',created_at:ago(1440),unit_price:'2.5',price_asset:'USDT',payment_status:'paid',payment_provider:'crypto'},
  {id:'ord_1043',qty:2,status:'pending',created_at:ago(40),unit_price:'2.5',price_asset:'USDT',payment_status:'waiting',payment_provider:'crypto'}
];
module.exports={ok:true,db:true,role:'user',commerceReady:true,
  paymentOptions:[{id:'crypto',title:'Crypto Pay',asset:'USDT'},{id:'ton',title:'Прямой TON',asset:'TON'}],
  numbers,orders,sms,smsMode:'full',smsToday:5,ownerContactUrl:'https://t.me/xsanx'};
