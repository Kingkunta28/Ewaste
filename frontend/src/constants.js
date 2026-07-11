export const USER_STORAGE_KEY = "ewaste_user";

export const initialRequestForm = {
  item_type: "",
  quantity: 1,
  condition: "",
  brand: "",
  pickup_address: "",
  pickup_date: "",
  notes: ""
};

export const ewasteItemOptions = [
  "Mobile Phone",
  "Laptop",
  "Desktop Computer",
  "Tablet",
  "Printer",
  "Television",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Router / Modem",
  "Charger / Cable",
  "Battery",
  "Refrigerator",
  "Microwave",
  "Other"
];

export const ewasteBrandOptionsByItem = {
  "Mobile Phone": ["Samsung", "Apple", "Tecno", "Infinix", "Nokia", "Huawei", "Xiaomi", "Other"],
  Laptop: ["HP", "Dell", "Lenovo", "Acer", "Asus", "Apple", "MSI", "Other"],
  "Desktop Computer": ["HP", "Dell", "Lenovo", "Acer", "Asus", "Custom Build", "Other"],
  Tablet: ["Samsung", "Apple", "Huawei", "Lenovo", "Amazon", "Other"],
  Printer: ["HP", "Canon", "Epson", "Brother", "Xerox", "Other"],
  Television: ["Samsung", "LG", "Sony", "TCL", "Hisense", "Panasonic", "Other"],
  Monitor: ["Dell", "HP", "Samsung", "LG", "AOC", "BenQ", "Other"],
  Keyboard: ["Logitech", "HP", "Dell", "Microsoft", "Razer", "Other"],
  Mouse: ["Logitech", "HP", "Dell", "Microsoft", "Razer", "Other"],
  "Router / Modem": ["TP-Link", "Huawei", "MikroTik", "Netgear", "D-Link", "Other"],
  "Charger / Cable": ["Samsung", "Apple", "Anker", "Oraimo", "Baseus", "Other"],
  Battery: ["Duracell", "Energizer", "Panasonic", "Sony", "Exide", "Other"],
  Refrigerator: ["LG", "Samsung", "Whirlpool", "Bosch", "Hisense", "Other"],
  Microwave: ["LG", "Samsung", "Panasonic", "Bosch", "Sharp", "Other"],
  Other: ["Other"]
};

export const ewasteConditionOptions = [
  "Working",
  "Partially Working",
  "Damaged",
  "Non-Working",
  "For Parts"
];
