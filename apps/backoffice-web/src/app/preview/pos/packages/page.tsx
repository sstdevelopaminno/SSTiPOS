"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type PackageTier = {
  name: string;
  badge: string;
  price: string;
  billing: string;
  description: string;
  suitable: string;
  upgrade: string;
  features: string[];
  limits: string[];
  recommended?: boolean;
};

type HardwareKit = {
  name: string;
  price: string;
  promo: string;
  suitable: string;
  includes: string[];
};

type ComparisonRow = {
  feature: string;
  trial: string;
  lite: string;
  starter: string;
  standard: string;
  pro: string;
  business: string;
};

const itStatus = "รออัปเดตจากระบบหลังบ้านของ IT";

const packages: PackageTier[] = [
  {
    name: "Free Trial",
    badge: "ทดลองก่อนจ่าย",
    price: "0 บาท",
    billing: "ทดลองใช้ฟรี 14 วัน",
    description: "เหมาะสำหรับร้านที่ต้องการทดลองระบบก่อนตัดสินใจ",
    suitable: "ร้านที่อยากลองขายหน้าร้าน เปิด/ปิดกะ และดูรายงานพื้นฐานก่อนเริ่มจ่ายจริง",
    upgrade: "เมื่อตัดสินใจใช้งานต่อ แนะนำอัปเป็น Starter หรือ Standard ตามจำนวนพนักงานและรูปแบบร้าน",
    features: [
      "1 ร้านค้า",
      "1 สาขา",
      "1 เครื่อง POS",
      "1-2 ผู้ใช้",
      "ทดลองขายหน้าร้าน",
      "ทดลองเปิด/ปิดกะ",
      "ทดลองรายงานยอดขายพื้นฐาน",
      "ไม่ต้องซื้อเครื่อง"
    ],
    limits: [
      "จำกัดการใช้งานเพื่อทดลองระบบ",
      "Trial 30 วันเฉพาะลูกค้าที่ซื้อชุดพร้อมเครื่องหรือผ่านการนัด Demo"
    ]
  },
  {
    name: "Launch Lite",
    badge: "โปรเปิดตัว",
    price: "199 บาท/เดือน",
    billing: "โปรเปิดตัว 3 เดือนแรก",
    description: "สำหรับร้านเล็กที่อยากเริ่มใช้ POS ในราคาประหยัด",
    suitable: "ร้านเล็กที่เริ่มขายหน้าร้านและต้องการระบบคิดเงินพื้นฐานแบบประหยัด",
    upgrade: "หลังครบโปร ต่ออายุเป็น Starter 399 บาท/เดือน หรือขยับเป็น Standard เมื่อเริ่มมีพนักงานหลายคน",
    features: [
      "ใช้ได้ 3 เดือนแรก",
      "1 ร้านค้า / 1 สาขา",
      "1 เครื่อง POS",
      "1-2 ผู้ใช้",
      "เมนูไม่เกิน 100 รายการ",
      "รายงานย้อนหลัง 30 วัน",
      "ขายหน้าร้าน",
      "เปิด/ปิดกะ",
      "รับเงินสด / รับโอน"
    ],
    limits: [
      "หลังครบโปร ต่ออายุเป็น Starter 399 บาท/เดือน",
      "ไม่มี QR โต๊ะ",
      "ไม่มีจอครัว",
      "ไม่มีสต๊อกวัตถุดิบ",
      "ไม่มีหลายสาขา"
    ]
  },
  {
    name: "Starter",
    badge: "เริ่มต้นคุ้ม",
    price: "399 บาท/เดือน",
    billing: "หรือ 3,588 บาท/ปี เฉลี่ย 299 บาท/เดือน",
    description: "เหมาะสำหรับร้านเล็ก ร้านก๋วยเตี๋ยว ร้านอาหารตามสั่ง และคาเฟ่ขนาดเล็ก",
    suitable: "ร้าน 1 สาขาที่ต้องการขายหน้าร้าน รับเงินสด/โอน/PromptPay และดูรายงานรายวัน",
    upgrade: "อัปเป็น Standard เมื่อมีโต๊ะหน้าร้าน ช่องทางเดลิเวอรี่ หรือพนักงานหลายคน",
    features: [
      "1 ร้านค้า",
      "1 สาขา",
      "1 เครื่อง POS",
      "2 ผู้ใช้",
      "เมนูไม่เกิน 200 รายการ",
      "ขายหน้าร้าน",
      "เปิด/ปิดกะ",
      "รับเงินสด / รับโอน / PromptPay QR",
      "ใบเสร็จพื้นฐาน",
      "รายงานยอดขายรายวัน/รายเดือน",
      "ภาษีและค่าบริการพื้นฐาน",
      "Audit พื้นฐาน",
      "รายงานย้อนหลัง 90 วัน"
    ],
    limits: ["ไม่มี QR โต๊ะ", "ไม่มีจอครัว", "ไม่มีสต๊อกวัตถุดิบ", "ไม่มีหลายสาขา"]
  },
  {
    name: "Standard",
    badge: "แนะนำ",
    price: "699 บาท/เดือน",
    billing: "หรือ 6,990 บาท/ปี",
    description: "เหมาะสำหรับร้านอาหารทั่วไปที่มีพนักงานและต้องการจัดการร้านจริงจัง",
    suitable: "เหมาะที่สุดสำหรับร้านอาหารทั่วไปที่มีหน้าร้าน โต๊ะ พนักงาน และช่องทางเดลิเวอรี่",
    upgrade: "อัปเป็น Pro เมื่อเริ่มใช้ QR โต๊ะ จอครัว หรือสต๊อกวัตถุดิบ",
    recommended: true,
    features: [
      "ทุกอย่างใน Starter",
      "2 เครื่อง POS",
      "5 ผู้ใช้",
      "เมนูไม่เกิน 500 รายการ",
      "จัดการโต๊ะ Dine-in",
      "Takeaway",
      "Delivery Manual เช่น Grab, LINE MAN, Shopee, Merchant App",
      "สิทธิ์ Owner / Manager / Staff",
      "ยกเลิกบิลด้วย PIN Manager/Owner",
      "รายงาน Cashier",
      "รายงานยอดขายละเอียด",
      "Export CSV",
      "ตั้งค่าภาษีรายสาขา",
      "ตั้งค่าบัญชีรับโอน/PromptPay",
      "Printer Profile",
      "Audit การเข้า/ออกระบบ",
      "รายงานย้อนหลัง 1 ปี"
    ],
    limits: ["ยังไม่รวม QR สั่งอาหารที่โต๊ะ", "ยังไม่รวมสต๊อกวัตถุดิบและสูตรอาหาร"]
  },
  {
    name: "Pro",
    badge: "ฟีเจอร์ครบ",
    price: "1,099 บาท/เดือน",
    billing: "หรือ 10,990 บาท/ปี",
    description: "สำหรับร้านที่ต้องการ QR โต๊ะ จอครัว สต๊อก และลดงานพนักงาน",
    suitable: "ร้านมีโต๊ะ มีครัว มีเมนูเยอะ หรือต้องการลดงานรับออเดอร์ด้วย QR โต๊ะ",
    upgrade: "อัปเป็น Business เมื่อเริ่มเปิดหลายสาขาและต้องการ Dashboard รวม",
    features: [
      "ทุกอย่างใน Standard",
      "3-5 เครื่อง POS",
      "10 ผู้ใช้",
      "เมนูไม่เกิน 1,500 รายการ",
      "QR สั่งอาหารที่โต๊ะ",
      "ลูกค้าเรียกพนักงานผ่าน QR",
      "ลูกค้าขอชำระบิลผ่าน QR",
      "Popup แจ้งเตือนใน POS",
      "เสียงแจ้งเตือน / พูดภาษาไทย",
      "จอครัว / Kitchen Ticket",
      "สต๊อกวัตถุดิบ",
      "สูตรอาหาร / Recipe / BOM",
      "ตัดสต๊อกอัตโนมัติ",
      "Stock Movement",
      "Approval สำหรับยกเลิกบิล/ปรับสต๊อก",
      "รายงานสินค้าขายดี",
      "รายงานยอดขายตามช่องทาง",
      "รายงานย้อนหลัง 2 ปี",
      "Support เร็วกว่า"
    ],
    limits: ["ยังไม่รวมการดูแลหลายสาขาแบบ Dashboard รวม", "โควตาอุปกรณ์และผู้ใช้ขึ้นกับการตั้งค่าจริง"]
  },
  {
    name: "Business Multi-Branch",
    badge: "หลายสาขา",
    price: "เริ่ม 1,990 บาท/เดือน",
    billing: "สาขาเพิ่ม +790 บาท/สาขา/เดือน",
    description: "สำหรับร้านหลายสาขา แฟรนไชส์ และเจ้าของที่ต้องการดูยอดรวม",
    suitable: "ร้าน 2 สาขาขึ้นไป แฟรนไชส์ หรือเจ้าของที่ต้องแยกสิทธิ์และดูยอดรวมทุกสาขา",
    upgrade: "เหมาะกับการวางระบบสำนักงานใหญ่ เมนูกลาง สิทธิ์รายสาขา และ Support Priority",
    features: [
      "หลายสาขา",
      "Dashboard รวมทุกสาขา",
      "แยกสิทธิ์พนักงานตามสาขา",
      "ตั้งค่าภาษีรายสาขา",
      "ตั้งค่าบัญชีรับโอนรายสาขา",
      "รายงานเปรียบเทียบสาขา",
      "Feature Gate รายสาขา",
      "Quota Users / Devices / Branches",
      "Audit Log เต็ม",
      "Support Priority",
      "Onboarding ตามตกลง"
    ],
    limits: ["รายละเอียดโควตาและค่าเริ่มต้นขึ้นกับจำนวนสาขา", "ต้องรอ IT/Admin ตรวจสอบก่อนเปิดใช้งานจริง"]
  }
];

const hardwareKits: HardwareKit[] = [
  {
    name: "Mini Kit",
    price: "9,900 - 12,900 บาท",
    promo: "ฟรี Starter 6 เดือน",
    suitable: "ร้านก๋วยเตี๋ยว ร้านอาหารตามสั่ง ร้านกาแฟเล็ก",
    includes: [
      "แท็บเล็ต Android หรือเครื่อง POS รุ่นเริ่มต้น",
      "Printer ใบเสร็จ",
      "ตั้งค่าเมนูเริ่มต้น 30 รายการ",
      "สอนใช้งานออนไลน์ 1 รอบ"
    ]
  },
  {
    name: "Starter Counter Kit",
    price: "18,900 - 24,900 บาท",
    promo: "ฟรี Starter 1 ปี",
    suitable: "ร้านอาหาร 1 สาขา คาเฟ่ ร้านหน้าร้านที่มีพนักงาน",
    includes: [
      "เครื่อง POS หรือแท็บเล็ตพร้อมขาตั้ง",
      "Printer ใบเสร็จ 80mm",
      "ลิ้นชักเงินสด",
      "ตั้งค่าเมนูเริ่มต้น 80 รายการ",
      "ตั้งค่า PromptPay/QR โอนเงิน"
    ]
  },
  {
    name: "Restaurant Pro Kit",
    price: "29,900 - 39,900 บาท",
    promo: "ฟรี Pro 6 เดือน หรือ Standard 1 ปี",
    suitable: "ร้านอาหารมีโต๊ะ ร้านหมูกระทะ ชาบู คาเฟ่ใหญ่ ร้านที่มีครัว",
    includes: [
      "เครื่อง POS หน้าเคาน์เตอร์",
      "Printer ใบเสร็จ",
      "Printer ครัว",
      "QR โต๊ะเริ่มต้น 20 โต๊ะ",
      "ตั้งค่าโต๊ะ/โซน",
      "สอนใช้งานออนไลน์ 2 รอบ"
    ]
  }
];

const comparisonRows: ComparisonRow[] = [
  { feature: "ขายหน้าร้าน POS", trial: "✓", lite: "✓", starter: "✓", standard: "✓", pro: "✓", business: "✓" },
  { feature: "เปิด/ปิดกะ", trial: "ทดลอง", lite: "✓", starter: "✓", standard: "✓", pro: "✓", business: "✓" },
  { feature: "รับเงินสด/โอน/PromptPay QR", trial: "พื้นฐาน", lite: "เงินสด/โอน", starter: "✓", standard: "✓", pro: "✓", business: "✓" },
  { feature: "รายงานยอดขาย", trial: "พื้นฐาน", lite: "30 วัน", starter: "90 วัน", standard: "1 ปี", pro: "2 ปี", business: "ตามตกลง" },
  { feature: "จัดการผู้ใช้", trial: "1-2", lite: "1-2", starter: "2", standard: "5", pro: "10", business: "ตามโควตา" },
  { feature: "จัดการเครื่อง POS", trial: "1 เครื่อง", lite: "1 เครื่อง", starter: "1 เครื่อง", standard: "2 เครื่อง", pro: "3-5 เครื่อง", business: "ตามโควตา" },
  { feature: "โต๊ะ Dine-in", trial: "-", lite: "-", starter: "-", standard: "✓", pro: "✓", business: "✓" },
  { feature: "Delivery Manual", trial: "-", lite: "-", starter: "-", standard: "✓", pro: "✓", business: "✓" },
  { feature: "Export CSV", trial: "-", lite: "-", starter: "-", standard: "✓", pro: "✓", business: "✓" },
  { feature: "QR สั่งอาหารที่โต๊ะ", trial: "-", lite: "-", starter: "-", standard: "-", pro: "✓", business: "✓" },
  { feature: "ลูกค้าเรียกพนักงานผ่าน QR", trial: "-", lite: "-", starter: "-", standard: "-", pro: "✓", business: "✓" },
  { feature: "จอครัว / Kitchen Ticket", trial: "-", lite: "-", starter: "-", standard: "-", pro: "✓", business: "✓" },
  { feature: "สต๊อกวัตถุดิบ", trial: "-", lite: "-", starter: "-", standard: "-", pro: "✓", business: "✓" },
  { feature: "สูตรอาหาร / BOM", trial: "-", lite: "-", starter: "-", standard: "-", pro: "✓", business: "✓" },
  { feature: "หลายสาขา", trial: "-", lite: "-", starter: "-", standard: "-", pro: "-", business: "✓" },
  { feature: "Audit Log เต็ม", trial: "-", lite: "-", starter: "พื้นฐาน", standard: "เข้า/ออก", pro: "Approval", business: "✓" },
  { feature: "Support Priority", trial: "-", lite: "-", starter: "-", standard: "-", pro: "เร็วกว่า", business: "Priority" }
];

const snapshotCards = [
  { name: "Launch Lite", price: "199 บาท/เดือน", note: "3 เดือนแรก" },
  { name: "Starter", price: "399 บาท/เดือน", note: "รายปีเฉลี่ย 299 บาท/เดือน" },
  { name: "Standard", price: "699 บาท/เดือน", note: "แนะนำ" },
  { name: "Pro", price: "1,099 บาท/เดือน", note: "ฟีเจอร์ครบ" },
  { name: "Business", price: "เริ่ม 1,990 บาท/เดือน", note: "หลายสาขา" }
];

export default function PackagePage() {
  const [selectedPackage, setSelectedPackage] = useState<PackageTier | null>(null);
  const [detailPackage, setDetailPackage] = useState<PackageTier | null>(null);
  const [selectedHardwareKit, setSelectedHardwareKit] = useState<HardwareKit | null>(null);

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto rounded-lg bg-[#fffaf3] text-slate-950 shadow-inner">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-lg border border-orange-200 bg-white shadow-sm">
          <div className="grid gap-5 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#fff1f2_100%)] p-5 lg:grid-cols-[1.3fr_1fr] lg:p-7">
            <div className="flex flex-col justify-center gap-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge text="ทดลองใช้ฟรี 14 วัน" />
                <StatusBadge text="เริ่มต้น 199 บาท/เดือน" />
                <StatusBadge text="รายปีเฉลี่ย 299 บาท/เดือน" />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-700">แพ็กเกจเช่าระบบ SSTIPOS</p>
                <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                  แพ็กเกจ POS ที่ใช้งาน
                </h1>
                <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-slate-700">
                  เลือกแพ็กเกจที่เหมาะกับร้านของคุณ เริ่มต้นใช้งานง่าย และอัปเกรดได้เมื่อร้านเติบโต
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-white">
                    !
                  </span>
                  <p>
                    การเลือกแพ็กเกจในหน้านี้เป็นการแสดงความสนใจเท่านั้น ระบบจะรออัปเดตแพ็กเกจจากระบบหลังบ้านของ IT
                    ก่อนเปิดใช้งานจริง
                  </p>
                </div>
              </div>
            </div>
            <MarketingSnapshot />
          </div>
        </section>

        <section aria-labelledby="software-packages" className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="software-packages" className="text-2xl font-black text-slate-950">
                แพ็กเกจ Software Only
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                เริ่มจากแพ็กเล็ก แล้วค่อยอัปเป็น QR โต๊ะ จอครัว สต๊อก หรือหลายสาขาเมื่อร้านพร้อม
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
              สถานะ: {itStatus}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((tier) => (
              <PackageCard
                key={tier.name}
                tier={tier}
                onSelect={() => setSelectedPackage(tier)}
                onDetails={() => setDetailPackage(tier)}
              />
            ))}
          </div>
        </section>

        <UpgradeCreditSection />
        <HardwarePreviewSection kits={hardwareKits} onSelect={setSelectedHardwareKit} />
        <FeatureComparisonTable rows={comparisonRows} />
        <PackageRulesSection />
      </div>

      {selectedPackage ? (
        <PackageSelectionModal tier={selectedPackage} onClose={() => setSelectedPackage(null)} />
      ) : null}
      {detailPackage ? <PackageDetailModal tier={detailPackage} onClose={() => setDetailPackage(null)} /> : null}
      {selectedHardwareKit ? (
        <HardwareModal kit={selectedHardwareKit} onClose={() => setSelectedHardwareKit(null)} />
      ) : null}
    </div>
  );
}

function StatusBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-black text-orange-700 shadow-sm">
      {text}
    </span>
  );
}

function MarketingSnapshot() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-white shadow-lg">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase text-orange-300">Screenshot-ready</p>
        <h2 className="mt-1 text-2xl font-black">แพ็กเกจเช่าระบบ SSTIPOS</h2>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          ระบบ POS ร้านอาหารไทย ใช้ได้ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์
        </p>
      </div>
      <div className="grid gap-2">
        {snapshotCards.map((item) => (
          <div key={item.name} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-white/10 px-3 py-2">
            <div>
              <p className="text-sm font-black text-white">{item.name}</p>
              <p className="text-xs font-medium text-orange-100">{item.note}</p>
            </div>
            <p className="text-right text-sm font-black text-orange-200">{item.price}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-orange-300/40 bg-orange-500/20 px-3 py-2 text-sm font-black text-orange-100">
        ซื้อชุดเครื่อง POS พร้อม SSTIPOS ฟรีระบบสูงสุด 1 ปี
      </div>
    </div>
  );
}

function PackageCard({
  tier,
  onSelect,
  onDetails
}: {
  tier: PackageTier;
  onSelect: () => void;
  onDetails: () => void;
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-lg border bg-white p-5 shadow-sm ${
        tier.recommended ? "border-orange-400 ring-2 ring-orange-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-950">{tier.name}</h3>
          {tier.recommended ? (
            <p className="mt-1 text-sm font-bold text-orange-700">เหมาะที่สุดสำหรับร้านอาหารทั่วไป</p>
          ) : null}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            tier.recommended ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-800"
          }`}
        >
          {tier.badge}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-3xl font-black tracking-normal text-slate-950">{tier.price}</p>
        <p className="mt-1 min-h-[40px] text-sm font-bold leading-5 text-slate-600">{tier.billing}</p>
        <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-700">{tier.description}</p>
      </div>

      <CheckList items={tier.features.slice(0, tier.recommended ? 12 : 9)} className="mt-4" />

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        {tier.limits.slice(0, 4).map((limit) => (
          <p key={limit}>- {limit}</p>
        ))}
      </div>

      <div className="mt-auto grid gap-2 pt-5">
        <button
          type="button"
          onClick={onSelect}
          className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-black transition ${
            tier.recommended
              ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
              : "bg-slate-950 text-white hover:bg-slate-800"
          }`}
        >
          เลือกแพ็กเกจนี้
        </button>
        <button
          type="button"
          onClick={onDetails}
          className="min-h-[42px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-50"
        >
          ดูรายละเอียด
        </button>
      </div>
    </article>
  );
}

function CheckList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`grid gap-2 text-sm leading-6 text-slate-700 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function UpgradeCreditSection() {
  return (
    <section className="rounded-lg border border-orange-200 bg-white p-5 shadow-sm" aria-labelledby="upgrade-credit">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-black text-orange-700">Upgrade Credit</p>
          <h2 id="upgrade-credit" className="mt-1 text-2xl font-black text-slate-950">
            Upgrade Credit อัปเกรดแล้วไม่เสียเปล่า
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            เมื่อลูกค้าอัปเกรดแพ็กเกจ ระบบสามารถนำมูลค่าคงเหลือของแพ็กเกจเดิมไปเป็นเครดิตส่วนลดในแพ็กเกจใหม่ได้
            เงื่อนไขเป็นไปตามรอบบิลและไม่สามารถแลกคืนเป็นเงินสด
          </p>
        </div>
        <CheckList
          items={[
            "ใช้เป็นเครดิตอัปเกรดแพ็กเกจเท่านั้น",
            "ไม่สามารถแลกคืนเป็นเงินสด",
            "ต้องรอระบบหลังบ้านของ IT อนุมัติและอัปเดตแพ็กเกจ"
          ]}
        />
      </div>
    </section>
  );
}

function HardwarePreviewSection({
  kits,
  onSelect
}: {
  kits: HardwareKit[];
  onSelect: (kit: HardwareKit) => void;
}) {
  return (
    <section aria-labelledby="hardware-kits" className="grid gap-4">
      <div>
        <h2 id="hardware-kits" className="text-2xl font-black text-slate-950">
          แพ็กเกจพร้อมเครื่อง POS
        </h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
          สำหรับร้านที่ต้องการเริ่มใช้งานทันที พร้อมเครื่อง ตั้งค่าร้าน และสอนใช้งาน
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {kits.map((kit) => (
          <article key={kit.name} className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">{kit.name}</h3>
                <p className="mt-1 text-sm font-bold text-slate-600">{kit.suitable}</p>
              </div>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">{kit.promo}</span>
            </div>
            <p className="mt-5 text-2xl font-black text-slate-950">{kit.price}</p>
            <CheckList items={kit.includes} className="mt-4" />
            <button
              type="button"
              onClick={() => onSelect(kit)}
              className="mt-auto min-h-[44px] rounded-lg bg-orange-600 px-4 py-2 text-sm font-black text-white transition hover:bg-orange-700"
            >
              สนใจชุดพร้อมเครื่อง
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="feature-table">
      <div className="mb-4">
        <h2 id="feature-table" className="text-2xl font-black text-slate-950">
          ตารางเปรียบเทียบฟีเจอร์
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600">ดูภาพรวมว่าแต่ละแพ็กเกจเหมาะกับการใช้งานระดับไหน</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-600">
              <th className="px-3 py-3">ฟีเจอร์</th>
              <th className="px-3 py-3 text-center">Trial</th>
              <th className="px-3 py-3 text-center">Lite</th>
              <th className="px-3 py-3 text-center">Starter</th>
              <th className="px-3 py-3 text-center">Standard</th>
              <th className="px-3 py-3 text-center">Pro</th>
              <th className="px-3 py-3 text-center">Business</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-b border-slate-100">
                <th className="px-3 py-3 font-bold text-slate-800">{row.feature}</th>
                <TableCell value={row.trial} />
                <TableCell value={row.lite} />
                <TableCell value={row.starter} />
                <TableCell value={row.standard} strong={row.standard === "✓"} />
                <TableCell value={row.pro} strong={row.pro === "✓"} />
                <TableCell value={row.business} strong={row.business === "✓"} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableCell({ value, strong = false }: { value: string; strong?: boolean }) {
  const isAvailable = value === "✓";
  return (
    <td
      className={`px-3 py-3 text-center text-sm font-bold ${
        isAvailable || strong ? "text-emerald-700" : value === "-" ? "text-slate-300" : "text-slate-600"
      }`}
    >
      {value}
    </td>
  );
}

function PackageRulesSection() {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm" aria-labelledby="package-rules">
      <h2 id="package-rules" className="text-2xl font-black">
        เงื่อนไขการใช้งานเบื้องต้น
      </h2>
      <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-200 md:grid-cols-2">
        {[
          "ทดลองใช้ฟรี 14 วัน",
          "Trial 30 วันสำหรับลูกค้าที่ซื้อชุดพร้อมเครื่องหรือผ่าน Demo",
          "Launch Lite 199 บาท ใช้ได้ 3 เดือนแรก",
          "หลังหมดโปร ต่ออายุเป็น Starter 399 บาท/เดือน",
          "รายปี Starter เฉลี่ย 299 บาท/เดือน",
          "การเลือกแพ็กเกจในหน้านี้ยังไม่ใช่การชำระเงิน",
          "ต้องรอระบบหลังบ้านของ IT ตรวจสอบและอัปเดตแพ็กเกจก่อนเปิดใช้งานจริง",
          "ราคาและโปรโมชันอาจเปลี่ยนแปลงตามเงื่อนไขบริษัท"
        ].map((rule) => (
          <p key={rule} className="flex gap-2">
            <span className="text-orange-300">-</span>
            <span>{rule}</span>
          </p>
        ))}
      </div>
      <p className="mt-5 rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-6 text-slate-300">
        ราคาชุดพร้อมเครื่องขึ้นอยู่กับรุ่นอุปกรณ์และพื้นที่ให้บริการ ฟีเจอร์บางรายการต้องเปิดใช้งานตามแพ็กเกจและสิทธิ์ผู้ใช้
      </p>
    </section>
  );
}

function PackageSelectionModal({ tier, onClose }: { tier: PackageTier; onClose: () => void }) {
  return (
    <Modal title={`เลือกแพ็กเกจ: ${tier.name}`} onClose={onClose}>
      <p className="text-sm leading-7 text-slate-700">
        ระบบได้รับความสนใจแพ็กเกจนี้แล้ว แต่ยังไม่เปิดใช้งานทันที แพ็กเกจจะต้องรออัปเดตจากระบบหลังบ้านของ IT ก่อน
      </p>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-black text-amber-950">สถานะ: {itStatus}</p>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          ทีมงานหรือผู้ดูแลระบบจะตรวจสอบแพ็กเกจ การชำระเงิน และสิทธิ์การใช้งาน ก่อนเปิดฟีเจอร์ให้กับร้านของคุณ
        </p>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-lg bg-orange-600 px-4 py-2 text-sm font-black text-white hover:bg-orange-700"
        >
          รับทราบ
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50"
        >
          ดูแพ็กเกจอื่น
        </button>
      </div>
    </Modal>
  );
}

function PackageDetailModal({ tier, onClose }: { tier: PackageTier; onClose: () => void }) {
  return (
    <Modal title={`รายละเอียดแพ็กเกจ ${tier.name}`} onClose={onClose}>
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-bold text-orange-700">{tier.badge}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{tier.price}</p>
          <p className="text-sm font-bold text-slate-600">{tier.billing}</p>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950">เหมาะกับ</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">{tier.suitable}</p>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950">ฟีเจอร์ทั้งหมด</h3>
          <CheckList items={tier.features} className="mt-2" />
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-950">ข้อจำกัดและหมายเหตุ</h3>
          <div className="mt-2 grid gap-1 text-sm leading-6 text-slate-700">
            {tier.limits.map((limit) => (
              <p key={limit}>- {limit}</p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h3 className="text-sm font-black text-orange-950">คำแนะนำการอัปเกรด</h3>
          <p className="mt-1 text-sm leading-6 text-orange-900">{tier.upgrade}</p>
        </div>
      </div>
    </Modal>
  );
}

function HardwareModal({ kit, onClose }: { kit: HardwareKit; onClose: () => void }) {
  return (
    <Modal title={`สนใจชุดพร้อมเครื่อง: ${kit.name}`} onClose={onClose}>
      <p className="text-sm leading-7 text-slate-700">
        สถานะ: {itStatus} ใบเสนอราคา รุ่นอุปกรณ์ พื้นที่ติดตั้ง และการเปิดใช้งานแพ็กเกจต้องให้ IT/Admin
        ตรวจสอบและยืนยันก่อนเริ่มใช้งานจริง
      </p>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="font-black text-slate-950">{kit.price}</p>
        <p className="mt-1 text-sm font-bold text-orange-700">{kit.promo}</p>
        <CheckList items={kit.includes} className="mt-3" />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 min-h-[44px] w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-black text-white hover:bg-orange-700"
      >
        รับทราบ
      </button>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-modal-title"
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="package-modal-title" className="text-xl font-black text-slate-950">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-black text-slate-600 hover:bg-slate-50"
            aria-label="ปิดหน้าต่าง"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}
