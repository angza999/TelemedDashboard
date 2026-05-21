# Telemed Dashboard

WebApp Dashboard สำหรับติดตามบริการ Telemedicine ของโรงพยาบาล โดยอ่านข้อมูลจากฐานข้อมูล HOSxP / HOSxP XE และกรองรายการจาก `ovstist.export_code = '5'`

## ความสามารถหลัก

- Login ก่อนเข้าระบบ
- เมนู `Telemed Dashboard`
- เมนู `ตั้งค่าฐานข้อมูล` สำหรับผู้ดูแลระบบ
- Filter วันที่เริ่มต้น / วันที่สิ้นสุด / ปีงบประมาณ
- KPI Card: Total, DM B2B, DM B2C, HT B2B, HT B2C
- กราฟแนวโน้มรายวันหรือรายเดือน
- กราฟสัดส่วน B2B และ B2C
- ตารางสรุปรายวัน
- Export Excel
- Query แบบ parameterized เพื่อลดความเสี่ยง SQL Injection
- ไม่แสดงข้อมูลผู้ป่วยรายบุคคลบน Dashboard

## ติดตั้ง

```bash
npm install
copy .env.example .env
npm start
```

เปิดใช้งานที่ `http://localhost:4300`

ค่าเริ่มต้นสำหรับทดสอบ:

- Username: `admin`
- Password: `admin1234`

ควรเปลี่ยน `ADMIN_USERNAME`, `ADMIN_PASSWORD` และ `SESSION_SECRET` ใน `.env` ก่อนใช้จริง

## ตั้งค่าฐานข้อมูล

ตั้งค่าผ่านหน้าเว็บได้ที่ `http://localhost:4300/settings` หลัง Login ด้วยผู้ใช้สิทธิ์ admin

หน้าตั้งค่ารองรับ:

- Host / IP
- Port
- Database
- User
- Password
- Connection limit
- ปุ่มทดสอบการเชื่อมต่อ
- ปุ่มบันทึกการตั้งค่า

ระบบจะบันทึกค่าที่ `data/db-config.json` และไฟล์นี้ถูก ignore จาก git เพื่อไม่ให้รหัสผ่านหลุดไปกับ source code

หรือกำหนดค่าเริ่มต้นผ่านไฟล์ `.env` ได้:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=hos
```

## หมายเหตุเรื่อง SQL

ไฟล์หลักอยู่ที่ `src/services/telemedService.js`

ระบบตั้งต้นใช้เงื่อนไข:

- Telemed: `ovstist.export_code = '5'`
- DM: `ovst.pdx LIKE 'E1%'` หรือ `ovstdiag.icd10 LIKE 'E1%'`
- HT: `ovst.pdx LIKE 'I1%'` หรือ `ovstdiag.icd10 LIKE 'I1%'`
- B2B: ชื่อใน `ovstist.name` มีคำว่า `B2B`
- B2C: รายการ DM/HT ที่ไม่เข้าเงื่อนไข B2B

ถ้าโรงพยาบาลมี SQL Telemed ที่ปรับแล้ว ให้แทน logic ใน `categoryCase()` และ `baseFrom()` โดยคงการส่งค่าวันที่ผ่าน placeholder `?` เพื่อรักษาความปลอดภัยจาก SQL Injection

## Admin Query Tool

เข้าใช้งานที่ `http://localhost:4300/admin/query-tool` ด้วยผู้ใช้สิทธิ์ `admin` เท่านั้น

ข้อจำกัดด้านความปลอดภัย:

- อนุญาตเฉพาะคำสั่ง `SELECT`
- ไม่อนุญาต semicolon หรือหลาย statement
- Block คำสั่งที่เปลี่ยนข้อมูลหรือโครงสร้าง เช่น `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`
- Block `INTO`, `OUTFILE`, `DUMPFILE` เพื่อป้องกันการเขียนไฟล์จากฝั่ง MySQL
- จำกัดผลลัพธ์สูงสุด 1000 rows โดยครอบ query ด้วย `LIMIT 1000`
- Export Excel ได้จากผลลัพธ์ล่าสุดใน session
- บันทึก log ที่ `data/query-tool.log.jsonl`

## Export และ Executive Dashboard

Dashboard หลักรองรับ:

- `GET /telemed/export.xlsx`
- `GET /telemed/export.pdf`

ทั้ง Excel และ PDF ใช้ข้อมูลจาก `fetchTelemedSummary()` ชุดเดียวกับหน้า Dashboard เพื่อให้ยอดตรงกัน

Executive Dashboard เข้าใช้งานที่ `http://localhost:4300/executive`

สิทธิ์ที่เข้าได้:

- `admin`
- `executive`

ถ้าต้องการเพิ่มบัญชีผู้บริหาร ให้ตั้งค่าใน `.env`

```env
EXECUTIVE_USERNAME=exec
EXECUTIVE_PASSWORD=change-me
EXECUTIVE_NAME=ผู้บริหาร
```

หน้า Executive Dashboard ใช้ข้อมูลจาก `fetchTelemedSummary()` ชุดเดียวกับ Dashboard หลัก และมี export:

- `GET /executive/export.pdf`

## โครงสร้างไฟล์

```text
app.js
src/
  config/users.js
  db.js
  middleware/auth.js
  routes/auth.js
  routes/telemed.js
  services/telemedService.js
views/
  auth/login.ejs
  telemed/dashboard.ejs
  partials/telemed-content.ejs
public/
  css/app.css
  js/dashboard.js
```
