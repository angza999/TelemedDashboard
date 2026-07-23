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

## Login and Session

- ผู้ใช้ที่ล็อกอินอยู่แล้วและเปิด `/login` อีกแท็บ จะถูกส่งไปหน้าเริ่มต้นตามสิทธิ์: `admin` และ `executive` ไป `/today-patients`, ส่วน `user` ไป `/telemed`.
- เมื่อเข้าสู่ระบบ ระบบจะสร้าง session ใหม่ก่อนเก็บเฉพาะ `id`, `username`, `name` และ `role`; ไม่มี password หรือ password hash ใน session.
- Logout ทำลาย session และล้าง cookie `telemed.sid`; แท็บอื่นจะกลับไป `/login` เมื่อมีการเปิดหน้าใหม่หรือรีเฟรช.
- ค่า cookie ใช้ `httpOnly`, `sameSite=lax` และอายุเริ่มต้น 8 ชั่วโมง (`SESSION_MAX_AGE_MS=28800000`). ตั้ง `USE_HTTPS=true` เฉพาะเมื่อระบบเปิดผ่าน HTTPS จริงเท่านั้น; LAN HTTP ต้องคง `false`.
- เปิด `LOG_AUTH_EVENTS=true` เมื่อต้องการ log เหตุการณ์ login/logout สำหรับตรวจสอบ โดยระบบจะไม่ log รหัสผ่าน, password hash, session secret หรือ connection string.
- หากตรวจพบว่า user storage ไม่มี/ปิดบัญชี admin ให้ตั้ง `ADMIN_USERNAME` และ `ADMIN_PASSWORD` ใน `.env` แล้วรัน `npm run ensure-admin` เพื่อสร้างหรือซ่อมเฉพาะบัญชี admin ของ WebApp. คำสั่งนี้ไม่เชื่อมต่อและไม่แก้ไข HOSxP. การรีเซ็ตรหัสผ่าน admin ที่มีอยู่ต้องกำหนด `RESET_ADMIN_PASSWORD=true` ชั่วคราวก่อนรัน แล้วตั้งกลับเป็น `false`.

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

## Today Patients และบริการ ER

หน้า `GET /today-patients` เป็น dashboard ภาพรวมผู้รับบริการวันนี้แบบ near real-time จาก HOSxP โดยดึงข้อมูลด้วย `SELECT` เท่านั้น และบันทึกเฉพาะ mapping/config ของ WebApp ลงไฟล์ใน `data/` เท่านั้น

การ์ด `อุบัติเหตุฉุกเฉิน ER` ใช้ mapping กลางของบริการ ER ที่หน้า `GET /admin/er-subclinics` โดยค่าเริ่มต้นมี 3 กลุ่ม:

- `ER_PATIENT`: ผู้ป่วยห้องฉุกเฉิน, depcode `004`, นับรวมในการ์ด ER หลัก และแสดงในรายละเอียด
- `INJECTION_WOUND`: ฉีดยา/ทำแผล, depcode `051`, แสดงในรายละเอียด แต่ไม่นับรวมในการ์ด ER หลัก
- `ER_TELEMED`: ER Telemed, depcode `082`, แสดงในรายละเอียด แต่ไม่นับรวมในการ์ด ER หลัก

API `GET /api/today-patients/summary` จะนับยอด ER card เฉพาะบริการ ER ที่ `include_in_card_total = true` และ active อยู่ ส่วน `GET /api/today-patients/er-subclinics` จะแสดงบริการที่ `show_in_detail = true` เพื่อใช้ใน modal รายละเอียดงาน ER วันนี้

ข้อห้ามสำคัญ: ระบบนี้ห้ามเขียนตารางหรือแก้ไขข้อมูลใด ๆ ใน HOSxP / HOSxP XE ทุกฟังก์ชันของ Today Patients และ Telemed Dashboard ต้องเป็น read-only ต่อฐานข้อมูลโรงพยาบาล

## NCD Subclinic Modal Audit

API `GET /api/today-patients/ncd-subclinics` ใช้ข้อมูลจาก mapping ของ WebApp เพื่อเปรียบเทียบยอด `NCD หลัก` กับยอด `คลินิกย่อย NCD` และส่งข้อมูลเสริมสำหรับตรวจสอบ ได้แก่ `main_total`, `diff_total`, `mapped_codes` ของแต่ละคลินิกย่อย และ `ungrouped` สำหรับห้องที่อยู่ใน mapping NCD หลักแต่ยังไม่ถูกผูกกับคลินิกย่อย

รายการ `ungrouped` ดึงจาก HOSxP ด้วย `SELECT` แบบ parameter binding เท่านั้น โดยนับ `COUNT(DISTINCT o.vn)` แยกตาม `ovst.main_dep` และ join `kskdepartment` เพื่อแสดงชื่อห้องใน modal ไม่มีการสร้างตารางหรือแก้ไขข้อมูลใด ๆ ใน HOSxP / HOSxP XE

## IPD Related Ward Modal

Modal `คลินิกย่อย IPD วันนี้` ในหน้า `/today-patients` ใช้แนวคิด `หอผู้ป่วยรวม` เป็นยอดหลักบนการ์ด IPD และ `รวมบริการ IPD ที่เกี่ยวข้อง` เป็นผลรวม Ward ที่แสดงใน modal เช่น `หอผู้ป่วยรวม` และ `Homeward` โดย Homeward ถือเป็น Ward ที่เกี่ยวข้องกับ IPD ไม่ใช่ mapping ผิด

API `GET /api/today-patients/ipd-subclinics` ส่ง `main_total`, `total`, `visible_ward_count`, `mapped_codes` และ `subclinics` เพื่อให้ frontend แสดงจำนวน Ward และรหัส Ward ที่ใช้คำนวณ ข้อมูลจาก HOSxP ยังคงอ่านจาก `ipt` ด้วย `SELECT COUNT(DISTINCT i.an)` เฉพาะผู้ป่วยที่ยังไม่จำหน่ายเท่านั้น ไม่มีการเขียนข้อมูลลง HOSxP

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
