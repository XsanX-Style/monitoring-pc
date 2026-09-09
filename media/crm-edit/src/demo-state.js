const now = Date.now();
const iso = d => new Date(now - d*86400000).toISOString();
const companies = [
  {id:'co1', name:'ООО «Вектор»',    status:'Клиент',  phone:'+7 495 120-45-10', industry:'Логистика'},
  {id:'co2', name:'Studio Nordic',    status:'Клиент',  phone:'+7 812 330-11-02', industry:'Дизайн'},
  {id:'co3', name:'ИП Сергеев',       status:'Клиент',  phone:'+7 903 771-33-90', industry:'Ритейл'},
  {id:'co4', name:'Атлант Групп',     status:'Лид',     phone:'+7 495 909-18-44', industry:'Строительство'},
  {id:'co5', name:'DriveMotors',      status:'Клиент',  phone:'+7 499 501-77-21', industry:'Авто'},
  {id:'co6', name:'Клиника «Норма»',  status:'Лид',     phone:'+7 812 445-60-30', industry:'Медицина'}
];
const clients = [
  {id:'cl1', name:'Иван Петров',    phone:'+7 999 123-45-67', email:'ivan@vektor.ru',  company:'ООО «Вектор»',   companyId:'co1', status:'Клиент', createdAt:iso(26), updatedAt:iso(1)},
  {id:'cl2', name:'Марина Ковалёва',phone:'+7 916 204-88-10', email:'m.k@nordic.studio',company:'Studio Nordic',  companyId:'co2', status:'Клиент', createdAt:iso(24), updatedAt:iso(2)},
  {id:'cl3', name:'Алексей Дроздов',phone:'+7 903 771-33-90', email:'a.drozdov@ip.ru', company:'ИП Сергеев',     companyId:'co3', status:'Клиент', createdAt:iso(21), updatedAt:iso(2)},
  {id:'cl4', name:'Ольга Никитина', phone:'+7 495 909-18-44', email:'nikitina@atlant.ru',company:'Атлант Групп',  companyId:'co4', status:'Лид',    createdAt:iso(12), updatedAt:iso(3)},
  {id:'cl5', name:'Дмитрий Волков', phone:'+7 499 501-77-21', email:'volkov@drive.ru',  company:'DriveMotors',    companyId:'co5', status:'Клиент', createdAt:iso(9),  updatedAt:iso(0)},
  {id:'cl6', name:'Анна Соколова',  phone:'+7 812 445-60-30', email:'sokolova@norma.ru',company:'Клиника «Норма»',companyId:'co6', status:'Лид',    createdAt:iso(6),  updatedAt:iso(0)},
  {id:'cl7', name:'Тимур Ахметов',  phone:'+7 987 330-12-77', email:'timur@mail.ru',    company:'',               companyId:'',    status:'Лид',    createdAt:iso(3),  updatedAt:iso(0)},
  {id:'cl8', name:'Екатерина Лис',  phone:'+7 921 660-04-19', email:'lis@bk.ru',        company:'',               companyId:'',    status:'Клиент', createdAt:iso(2),  updatedAt:iso(0)}
];
const D = (id,title,client,clientId,companyId,value,stage,source,days) =>
  ({id,title,client,clientId,companyId,value,stage,source,createdAt:iso(days),updatedAt:iso(Math.max(0,days-2))});
const deals = [
  D('d1','Внедрение CRM + бот','Иван Петров','cl1','co1',180000,'Оплата','Telegram',27),
  D('d2','Пакет «Продажи»','Марина Ковалёва','cl2','co2',96000,'Оплата','Сайт',23),
  D('d3','CRM под ключ','Алексей Дроздов','cl3','co3',210000,'Оплата','Рекомендация',18),
  D('d4','Автоворонка','Дмитрий Волков','cl5','co5',145000,'Оплата','Telegram',11),
  D('d5','Бот приёма заявок','Екатерина Лис','cl8','',64000,'Оплата','Instagram',5),
  D('d6','CRM + интеграции','Ольга Никитина','cl4','co4',320000,'Переговоры','Сайт',10),
  D('d7','Модуль аналитики','Анна Соколова','cl6','co6',88000,'Переговоры','Telegram',6),
  D('d8','Тариф Pro · год','Тимур Ахметов','cl7','',54000,'В работе','Сайт',4),
  D('d9','Доработка воронки','Иван Петров','cl1','co1',75000,'В работе','Telegram',3),
  D('d10','Подключение Avito','Марина Ковалёва','cl2','co2',42000,'В работе','Avito',2),
  D('d11','Заявка с сайта','Дмитрий Волков','cl5','co5',120000,'Новая','Сайт',1),
  D('d12','Заявка из Telegram','Тимур Ахметов','cl7','',35000,'Новая','Telegram',0),
  D('d13','Запрос демо','Анна Соколова','cl6','co6',68000,'Новая','Сайт',0)
];
const tasks = [
  {id:'t1',title:'Перезвонить Ивану по интеграции',clientId:'cl1',dealId:'d9',due:iso(-0),priority:'Высокий',status:'В работе',done:false,note:'',createdAt:iso(2),updatedAt:iso(0)},
  {id:'t2',title:'Выставить счёт Атлант Групп',clientId:'cl4',dealId:'d6',due:iso(-1),priority:'Высокий',status:'В работе',done:false,note:'',createdAt:iso(3),updatedAt:iso(0)},
  {id:'t3',title:'Отправить КП клинике «Норма»',clientId:'cl6',dealId:'d7',due:iso(-1),priority:'Средний',status:'Новая',done:false,note:'',createdAt:iso(1),updatedAt:iso(0)},
  {id:'t4',title:'Демо CRM для DriveMotors',clientId:'cl5',dealId:'d11',due:iso(-2),priority:'Средний',status:'Новая',done:false,note:'',createdAt:iso(1),updatedAt:iso(0)},
  {id:'t5',title:'Закрыть сделку по Avito',clientId:'cl2',dealId:'d10',due:iso(-3),priority:'Низкий',status:'Новая',done:false,note:'',createdAt:iso(2),updatedAt:iso(1)},
  {id:'t6',title:'Собрать отчёт за месяц',clientId:'',dealId:'',due:iso(1),priority:'Средний',status:'Готово',done:true,note:'',createdAt:iso(6),updatedAt:iso(1)}
];
const activity = [
  {id:'a1',action:'Оплата получена',type:'deal',entityId:'d5',title:'Бот приёма заявок',detail:'64 000 ₽ · Instagram',createdAt:iso(0)},
  {id:'a2',action:'Новая заявка',type:'deal',entityId:'d12',title:'Заявка из Telegram',detail:'35 000 ₽ · Telegram',createdAt:iso(0)},
  {id:'a3',action:'Сделка перешла на этап «Переговоры»',type:'deal',entityId:'d6',title:'CRM + интеграции',detail:'320 000 ₽',createdAt:iso(0)},
  {id:'a4',action:'Добавлен клиент',type:'client',entityId:'cl7',title:'Тимур Ахметов',detail:'Сайт',createdAt:iso(1)},
  {id:'a5',action:'Задача выполнена',type:'task',entityId:'t6',title:'Собрать отчёт за месяц',detail:'',createdAt:iso(1)},
  {id:'a6',action:'Оплата получена',type:'deal',entityId:'d4',title:'Автоворонка',detail:'145 000 ₽ · Telegram',createdAt:iso(2)}
];
module.exports = {
  ok:true, revision:42,
  state:{clients,companies,deals,tasks,activity,
    settings:{dealStages:['Новая','В работе','Переговоры','Оплата'],
      dashboardWidgets:['kpis','quick','pipeline','sales','sources','tasks','activity'],
      dashboardPeriod:'30'}}
};
