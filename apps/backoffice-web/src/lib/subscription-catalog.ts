import type { PackageCatalogItem, PackageFeatureCatalogItem } from "@pos/pos-domain";

export const DEFAULT_PACKAGE_FEATURE_CATALOG: PackageFeatureCatalogItem[] = [
  {
    code: "core_pos_sales",
    name: "Core POS Sales",
    description: "หน้าขายพื้นฐาน สร้างออเดอร์ คิดเงิน และออกใบเสร็จ",
    defaultMonthlyPrice: 0,
    defaultYearlyPrice: 0,
    defaultPerpetualPrice: 0,
    includedByDefault: true,
    pricedPerBranch: false,
    isActive: true
  },
  {
    code: "table_management",
    name: "Table Management",
    description: "เปิดโต๊ะ ย้ายโต๊ะ จัดโซนโต๊ะ และตามสถานะบิล",
    defaultMonthlyPrice: 490,
    defaultYearlyPrice: 490 * 12,
    defaultPerpetualPrice: 8900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  },
  {
    code: "qr_table_ordering",
    name: "QR Table Ordering",
    description: "ลูกค้าสแกน QR และส่งรายการเข้าหน้าขาย",
    defaultMonthlyPrice: 690,
    defaultYearlyPrice: 690 * 12,
    defaultPerpetualPrice: 14900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  },
  {
    code: "customer_facing_display",
    name: "Customer Display",
    description: "หน้าจอลูกค้าดูรายการสินค้า/ยอดรวมแบบเรียลไทม์",
    defaultMonthlyPrice: 250,
    defaultYearlyPrice: 250 * 12,
    defaultPerpetualPrice: 4900,
    includedByDefault: false,
    pricedPerBranch: false,
    isActive: true
  },
  {
    code: "transfer_slip_verification",
    name: "Transfer Slip Verification",
    description: "อัปโหลดสลิปโอนและตรวจสอบก่อนปิดบิล",
    defaultMonthlyPrice: 390,
    defaultYearlyPrice: 390 * 12,
    defaultPerpetualPrice: 6900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  },
  {
    code: "staff_qr_clockin",
    name: "Staff QR Clock-in",
    description: "สแกน QR ยืนยันตัวตนและลงเวลาเข้าใช้งาน",
    defaultMonthlyPrice: 190,
    defaultYearlyPrice: 190 * 12,
    defaultPerpetualPrice: 3900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  },
  {
    code: "advanced_sales_reports",
    name: "Advanced Sales Reports",
    description: "รายงานสรุปยอดขายเชิงลึก หลายสาขา",
    defaultMonthlyPrice: 790,
    defaultYearlyPrice: 790 * 12,
    defaultPerpetualPrice: 16900,
    includedByDefault: false,
    pricedPerBranch: false,
    isActive: true
  },
  {
    code: "receipt_reprint_history",
    name: "Receipt Reprint History",
    description: "ค้นหาและพิมพ์ใบเสร็จย้อนหลัง พร้อมประวัติการพิมพ์",
    defaultMonthlyPrice: 290,
    defaultYearlyPrice: 290 * 12,
    defaultPerpetualPrice: 5900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  },
  {
    code: "multi_terminal_sync",
    name: "Multi Terminal Sync",
    description: "หลายเครื่องต่อสาขา ซิงก์สถานะขายร่วมกัน",
    defaultMonthlyPrice: 590,
    defaultYearlyPrice: 590 * 12,
    defaultPerpetualPrice: 12900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  },
  {
    code: "offline_queue_resilience",
    name: "Offline Queue Resilience",
    description: "คิวออฟไลน์และ retry อัตโนมัติ เมื่อเน็ตกลับมา",
    defaultMonthlyPrice: 350,
    defaultYearlyPrice: 350 * 12,
    defaultPerpetualPrice: 6900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  },
  {
    code: "desktop_app_runtime",
    name: "Desktop App Runtime",
    description: "ติดตั้งเป็นโปรแกรมบนคอมพิวเตอร์ (online/offline hybrid)",
    defaultMonthlyPrice: 450,
    defaultYearlyPrice: 450 * 12,
    defaultPerpetualPrice: 10900,
    includedByDefault: false,
    pricedPerBranch: false,
    isActive: true
  },
  {
    code: "barcode_scanner_mode",
    name: "Barcode Scanner Mode",
    description: "รองรับร้านของชำ เครื่องยิงบาร์โค้ด และ fast checkout",
    defaultMonthlyPrice: 290,
    defaultYearlyPrice: 290 * 12,
    defaultPerpetualPrice: 5900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  },
  {
    code: "kitchen_printing",
    name: "Kitchen Printing",
    description: "ส่งบิลเข้าครัวแยกเครื่องพิมพ์ตาม station",
    defaultMonthlyPrice: 350,
    defaultYearlyPrice: 350 * 12,
    defaultPerpetualPrice: 6900,
    includedByDefault: false,
    pricedPerBranch: true,
    isActive: true
  }
];

export const DEFAULT_PACKAGE_CATALOG: PackageCatalogItem[] = [
  {
    code: "starter",
    name: "Starter",
    baseMonthlyPrice: 1490,
    baseYearlyPrice: 1490 * 12,
    basePerpetualPrice: 29900,
    maxBranchesIncluded: 1,
    extraBranchMonthlyPrice: 890,
    extraBranchYearlyPrice: 890 * 12,
    extraBranchPerpetualPrice: 15900,
    maxTerminalsPerBranchIncluded: 1,
    extraTerminalMonthlyPrice: 290,
    extraTerminalYearlyPrice: 290 * 12,
    extraTerminalPerpetualPrice: 5900,
    includedFeatureCodes: ["core_pos_sales"],
    isActive: true
  },
  {
    code: "growth",
    name: "Growth",
    baseMonthlyPrice: 2490,
    baseYearlyPrice: 2490 * 12,
    basePerpetualPrice: 44900,
    maxBranchesIncluded: 2,
    extraBranchMonthlyPrice: 790,
    extraBranchYearlyPrice: 790 * 12,
    extraBranchPerpetualPrice: 13900,
    maxTerminalsPerBranchIncluded: 2,
    extraTerminalMonthlyPrice: 250,
    extraTerminalYearlyPrice: 250 * 12,
    extraTerminalPerpetualPrice: 4900,
    includedFeatureCodes: ["core_pos_sales", "multi_terminal_sync", "offline_queue_resilience"],
    isActive: true
  },
  {
    code: "enterprise",
    name: "Enterprise",
    baseMonthlyPrice: 4990,
    baseYearlyPrice: 4990 * 12,
    basePerpetualPrice: 89900,
    maxBranchesIncluded: 5,
    extraBranchMonthlyPrice: 690,
    extraBranchYearlyPrice: 690 * 12,
    extraBranchPerpetualPrice: 12900,
    maxTerminalsPerBranchIncluded: 4,
    extraTerminalMonthlyPrice: 190,
    extraTerminalYearlyPrice: 190 * 12,
    extraTerminalPerpetualPrice: 3900,
    includedFeatureCodes: [
      "core_pos_sales",
      "multi_terminal_sync",
      "offline_queue_resilience",
      "table_management",
      "kitchen_printing",
      "customer_facing_display"
    ],
    isActive: true
  }
];
