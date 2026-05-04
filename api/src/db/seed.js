import { query, queryOne } from './client.js';

console.log('Seeding...');

// Users
await query(`INSERT INTO users (id,email,name,role) VALUES
  ('usr_admin',  'admin@pattarapol.co.th',  'Admin',          'admin'),
  ('usr_staff1', 'waraporn@pattarapol.co.th','Waraporn',       'staff'),
  ('usr_staff2', 'chutharat@pattarapol.co.th','Chutharat',     'staff'),
  ('usr_mgr',    'manager@pattarapol.co.th', 'Manager',        'manager')
  ON CONFLICT DO NOTHING`);
console.log('✓ Users');

// RFQ 26/007 — Silicone
const r007 = await queryOne(`SELECT id FROM customer_rfqs WHERE rfq_number='26/007'`);
if (!r007) {
  const rows = await query(`
    INSERT INTO customer_rfqs
      (rfq_number,customer_name,customer_contact,customer_email,customer_phone,
       customer_address,received_date,delivery_due_date,status,
       pdf_filename,notes,created_by,created_by_name)
    VALUES
      ('26/007','Microchip Technology (Thailand) Co., Ltd.',
       'K.WARAPORN M',NULL,'',
       '14 Moo 1, T.Wangtakhien, A.Muangchachemgsao, Chachemgsao 24000',
       '2026-01-21',NULL,'received',
       '007_Microchip_Silicone_dowsil.pdf',
       '* DELIVERY 45 DAY AFTER RECEIVED P/O',
       'usr_staff1','Waraporn')
    RETURNING id`);
  const id = rows[0].id;
  await query(`INSERT INTO rfq_items (rfq_id,item_no,description,quantity,unit,target_price,our_price,amount)
    VALUES ($1,1,'Dow DOWSIL™ 736 RTV Heat Resistant Sealant Silicone Red 300 mL Tube',4,'Tube',975,975,3900)`,
    [id]);
  await query(`INSERT INTO rfq_status_history (rfq_id,from_status,to_status,comment,actor_name)
    VALUES ($1,NULL,'received','RFQ received from customer','Waraporn')`, [id]);
  console.log('✓ RFQ 26/007 (Silicone)');
}

// RFQ 26/004 — Batteries
const r004 = await queryOne(`SELECT id FROM customer_rfqs WHERE rfq_number='26/004'`);
if (!r004) {
  const rows = await query(`
    INSERT INTO customer_rfqs
      (rfq_number,customer_name,customer_contact,customer_email,customer_phone,
       customer_address,received_date,delivery_due_date,status,
       pdf_filename,notes,created_by,created_by_name)
    VALUES
      ('26/004','Microchip Technology (Thailand) Co., Ltd.',
       'K.Chutharat F',NULL,'',
       '14 Moo 1, T.Wangtakhien, A.Muangchachemgsao, Chachemgsao 24000',
       '2026-01-08',NULL,'received',
       '004_Microchip_Batteries.pdf',
       '* DELIVERY 45 DAY AFTER RECEIVED P/O',
       'usr_staff2','Chutharat')
    RETURNING id`);
  const id = rows[0].id;
  const items = [
    [1,'ถ่านอัลคาไลน์ PANASONIC 6LR61T/1B 9V',24,'Pack',80,80,1920],
    [2,'ถ่านอัลคาไลน์ PANASONIC LR6T/8B AA (แพ็ค 8 ก้อน)',24,'Pack',200,200,4800],
    [3,'ถ่านอัลคาไลน์ PANASONIC LR03T/4B AAA (แพ็ค 4 ก้อน)',24,'Pack',115,115,2760],
    [4,'ถ่านอัลคาไลน์ PANASONIC LR20T/2B D',24,'Pack',100,100,2400],
    [5,'ถ่านไฟฉาย Panasonic GOLD ขนาด D (2 ก้อน/แพ็ค)',6,'Pack',50,50,300],
    [6,'ถ่านไฟฉาย Panasonic GOLD ขนาด AA (4 ก้อน/แพ็ค)',12,'Pack',45,45,540],
    [7,'ถ่านไฟฉาย Panasonic GOLD ขนาด AAA (4 ก้อน/แพ็ค)',12,'Pack',50,50,600],
    [8,'ถ่านกระดุม Panasonic CR2430',24,'Piece',45,45,1080],
    [9,'ถ่านกระดุม Panasonic CR2032',24,'Piece',55,55,1320],
    [10,'ถ่านกระดุม Panasonic CR2025',12,'Piece',60,60,720],
    [11,'ถ่านกระดุม Panasonic CR2016',12,'Piece',60,60,720],
  ];
  for (const [no,desc,qty,unit,tp,op,amt] of items) {
    await query(`INSERT INTO rfq_items (rfq_id,item_no,description,quantity,unit,target_price,our_price,amount)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id,no,desc,qty,unit,tp,op,amt]);
  }
  await query(`INSERT INTO rfq_status_history (rfq_id,from_status,to_status,comment,actor_name)
    VALUES ($1,NULL,'received','RFQ received from customer','Chutharat')`, [id]);
  console.log('✓ RFQ 26/004 (Batteries)');
}

console.log('\n✓ Seed complete');
console.log('Demo login: any email above · any password');
process.exit(0);
