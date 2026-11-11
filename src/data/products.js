export const products = {
  restaurants: [
    // Olumo Bites (id: 3)
    { id: 101, vendorId: 3, name: "Jollof Rice & Chicken", price: 2500, image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop", category: "Main Course" },
    { id: 102, vendorId: 3, name: "Fried Rice Combo", price: 2200, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop", category: "Main Course" },
    { id: 103, vendorId: 3, name: "Pounded Yam & Egusi", price: 1800, image: "https://images.unsplash.com/photo-1609501676725-7186f017a4b0?w=400&h=300&fit=crop", category: "Swallow" },
    { id: 104, vendorId: 3, name: "Meat Pie", price: 500, image: "https://images.unsplash.com/photo-1509315811345-672d83ef2fbc?w=400&h=300&fit=crop", category: "Snacks" },
    
    // Amala Joint Express (id: 4)
    { id: 201, vendorId: 4, name: "Amala & Ewedu", price: 1500, image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop", category: "Swallow" },
    { id: 202, vendorId: 4, name: "Amala & Gbegiri", price: 1600, image: "https://images.unsplash.com/photo-1609501676725-7186f017a4b0?w=400&h=300&fit=crop", category: "Swallow" },
    { id: 203, vendorId: 4, name: "Assorted Meat", price: 800, image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop", category: "Protein" },
    { id: 204, vendorId: 4, name: "Fish (Titus)", price: 1200, image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop", category: "Protein" },
    
    // Chicken Republic (id: 8)
    { id: 301, vendorId: 8, name: "Rotisserie Chicken", price: 3500, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop", category: "Chicken" },
    { id: 302, vendorId: 8, name: "Chicken Wings (6pc)", price: 2000, image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop", category: "Chicken" },
    { id: 303, vendorId: 8, name: "Beef Burger", price: 1800, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", category: "Burgers" },
    { id: 304, vendorId: 8, name: "Fries (Large)", price: 1000, image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=300&fit=crop", category: "Sides" },
    
    // Bukka Mama Put (id: 9)
    { id: 401, vendorId: 9, name: "Rice & Stew", price: 1200, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop", category: "Main Course" },
    { id: 402, vendorId: 9, name: "Beans & Plantain", price: 1000, image: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400&h=300&fit=crop", category: "Main Course" },
    { id: 403, vendorId: 9, name: "Eba & Okra Soup", price: 1300, image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop", category: "Swallow" },
    { id: 404, vendorId: 9, name: "Moi Moi", price: 400, image: "https://images.unsplash.com/photo-1612182062631-d88b95d89bf0?w=400&h=300&fit=crop", category: "Sides" },
    
    // Tasty Bites Kitchen (id: 16) - NEW
    { id: 1601, vendorId: 16, name: "Pasta Carbonara", price: 2800, image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop", category: "Continental" },
    { id: 1602, vendorId: 16, name: "Grilled Chicken & Rice", price: 3000, image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop", category: "Mains" },
    { id: 1603, vendorId: 16, name: "Fish & Chips", price: 2500, image: "https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=400&h=300&fit=crop", category: "Continental" },
    { id: 1604, vendorId: 16, name: "Caesar Salad", price: 1800, image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop", category: "Appetizers" },
    
    // Mr Bigg's Abeokuta (id: 17) - NEW
    { id: 1701, vendorId: 17, name: "Meat Pie", price: 600, image: "https://images.unsplash.com/photo-1509315811345-672d83ef2fbc?w=400&h=300&fit=crop", category: "Snacks" },
    { id: 1702, vendorId: 17, name: "Chicken Pie", price: 700, image: "https://images.unsplash.com/photo-1601000938365-f182c9c79499?w=400&h=300&fit=crop", category: "Snacks" },
    { id: 1703, vendorId: 17, name: "Scotch Egg", price: 500, image: "https://images.unsplash.com/photo-1628953872419-f1a0a7eb9bf2?w=400&h=300&fit=crop", category: "Snacks" },
    { id: 1704, vendorId: 17, name: "Sausage Roll", price: 800, image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400&h=300&fit=crop", category: "Snacks" },
    
    // Mama Cass Express (id: 18) - NEW
    { id: 1801, vendorId: 18, name: "Pepper Soup (Goat)", price: 2500, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", category: "Soups" },
    { id: 1802, vendorId: 18, name: "Asun (Spicy Goat)", price: 3500, image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop", category: "Grills" },
    { id: 1803, vendorId: 18, name: "Ofada Rice & Stew", price: 2000, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop", category: "Mains" },
    { id: 1804, vendorId: 18, name: "Suya (Large)", price: 1500, image: "https://images.unsplash.com/photo-1604908554035-ea1e4fc0c4e9?w=400&h=300&fit=crop", category: "Grills" },
  ],
  
  markets: [
    // Asero Market (id: 1)
    { id: 501, vendorId: 1, name: "Fresh Tomatoes (1kg)", price: 800, image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&h=300&fit=crop", category: "Vegetables" },
    { id: 502, vendorId: 1, name: "Onions (1kg)", price: 600, image: "https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb0?w=400&h=300&fit=crop", category: "Vegetables" },
    { id: 503, vendorId: 1, name: "Green Pepper (500g)", price: 400, image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop", category: "Vegetables" },
    { id: 504, vendorId: 1, name: "Watermelon", price: 1500, image: "https://images.unsplash.com/photo-1587049352846-4a222e784faf?w=400&h=300&fit=crop", category: "Fruits" },
    
    // Lafenwa Market (id: 2)
    { id: 601, vendorId: 2, name: "Rice (5kg bag)", price: 5000, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop", category: "Grains" },
    { id: 602, vendorId: 2, name: "Garri (2kg)", price: 1200, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop", category: "Grains" },
    { id: 603, vendorId: 2, name: "Cooking Oil (1L)", price: 1800, image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop", category: "Provisions" },
    { id: 604, vendorId: 2, name: "Indomie Noodles (Pack)", price: 2500, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop", category: "Provisions" },
    
    // Itoku Market (id: 7)
    { id: 701, vendorId: 7, name: "Adire Fabric (2 yards)", price: 3500, image: "https://images.unsplash.com/photo-1618453292507-4959ece6429e?w=400&h=300&fit=crop", category: "Fabrics" },
    { id: 702, vendorId: 7, name: "Ankara Print (6 yards)", price: 5000, image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop", category: "Fabrics" },
    { id: 703, vendorId: 7, name: "Traditional Beads", price: 2000, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=300&fit=crop", category: "Accessories" },
    { id: 704, vendorId: 7, name: "Wooden Carving", price: 4000, image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400&h=300&fit=crop", category: "Crafts" },
  ],
  
  pharmacies: [
    // CarePlus Pharmacy (id: 5)
    { id: 801, vendorId: 5, name: "Paracetamol (10 tablets)", price: 200, image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=300&fit=crop", category: "Pain Relief" },
    { id: 802, vendorId: 5, name: "Vitamin C (30 tablets)", price: 1500, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop", category: "Supplements" },
    { id: 803, vendorId: 5, name: "First Aid Kit", price: 3500, image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=300&fit=crop", category: "Medical Supplies" },
    { id: 804, vendorId: 5, name: "Digital Thermometer", price: 2500, image: "https://images.unsplash.com/photo-1584362917165-526a968579e8?w=400&h=300&fit=crop", category: "Equipment" },
    
    // SwiftMed Express (id: 6)
    { id: 901, vendorId: 6, name: "Ibuprofen (20 tablets)", price: 500, image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=300&fit=crop", category: "Pain Relief" },
    { id: 902, vendorId: 6, name: "Cough Syrup", price: 1200, image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&h=300&fit=crop", category: "Cold & Flu" },
    { id: 903, vendorId: 6, name: "Hand Sanitizer (500ml)", price: 800, image: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400&h=300&fit=crop", category: "Hygiene" },
    { id: 904, vendorId: 6, name: "Face Mask (Pack of 50)", price: 2000, image: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400&h=300&fit=crop", category: "PPE" },
    
    // Alpha Pharmacy (id: 10)
    { id: 1001, vendorId: 10, name: "Blood Pressure Monitor", price: 8000, image: "https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?w=400&h=300&fit=crop", category: "Equipment" },
    { id: 1002, vendorId: 10, name: "Multivitamins", price: 2500, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop", category: "Supplements" },
    { id: 1003, vendorId: 10, name: "Antiseptic Cream", price: 600, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop", category: "Topical" },
    { id: 1004, vendorId: 10, name: "Cotton Wool (100g)", price: 400, image: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=400&h=300&fit=crop", category: "Medical Supplies" },
  ],
  
  shops: [
    // Fashion Hub (id: 11)
    { id: 1101, vendorId: 11, name: "Men's T-Shirt", price: 3500, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop", category: "Clothing" },
    { id: 1102, vendorId: 11, name: "Women's Dress", price: 8000, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=300&fit=crop", category: "Clothing" },
    { id: 1103, vendorId: 11, name: "Leather Belt", price: 2500, image: "https://images.unsplash.com/photo-1624222247344-550fb60583bb?w=400&h=300&fit=crop", category: "Accessories" },
    { id: 1104, vendorId: 11, name: "Sneakers", price: 12000, image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=300&fit=crop", category: "Footwear" },
    
    // TechZone Electronics (id: 12)
    { id: 1201, vendorId: 12, name: "Wireless Earbuds", price: 15000, image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=300&fit=crop", category: "Audio" },
    { id: 1202, vendorId: 12, name: "Phone Charger (Fast)", price: 3500, image: "https://images.unsplash.com/photo-1591290619762-3fb0a4be29af?w=400&h=300&fit=crop", category: "Accessories" },
    { id: 1203, vendorId: 12, name: "Power Bank (20000mAh)", price: 8000, image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=300&fit=crop", category: "Accessories" },
    { id: 1204, vendorId: 12, name: "Bluetooth Speaker", price: 12000, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop", category: "Audio" },
    
    // HomeEssentials Store (id: 13)
    { id: 1301, vendorId: 13, name: "Electric Kettle", price: 6500, image: "https://images.unsplash.com/photo-1621274403997-37aac5a9e8b8?w=400&h=300&fit=crop", category: "Kitchen" },
    { id: 1302, vendorId: 13, name: "Blender", price: 15000, image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=300&fit=crop", category: "Kitchen" },
    { id: 1303, vendorId: 13, name: "Bedsheet Set", price: 8000, image: "https://images.unsplash.com/photo-1615800001234-b5c5f07b4ac9?w=400&h=300&fit=crop", category: "Bedroom" },
    { id: 1304, vendorId: 13, name: "Table Lamp", price: 4500, image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=300&fit=crop", category: "Lighting" },
    
    // Beauty Plaza (id: 14)
    { id: 1401, vendorId: 14, name: "Moisturizer Cream", price: 5000, image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=300&fit=crop", category: "Skincare" },
    { id: 1402, vendorId: 14, name: "Lipstick Set", price: 8000, image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=300&fit=crop", category: "Makeup" },
    { id: 1403, vendorId: 14, name: "Hair Relaxer Kit", price: 3500, image: "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=400&h=300&fit=crop", category: "Hair Care" },
    { id: 1404, vendorId: 14, name: "Perfume (50ml)", price: 12000, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=300&fit=crop", category: "Fragrance" },
    
    // Sports Arena (id: 15)
    { id: 1501, vendorId: 15, name: "Football", price: 5000, image: "https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aae?w=400&h=300&fit=crop", category: "Sports Equipment" },
    { id: 1502, vendorId: 15, name: "Yoga Mat", price: 4500, image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop", category: "Fitness" },
    { id: 1503, vendorId: 15, name: "Running Shoes", price: 18000, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop", category: "Footwear" },
    { id: 1504, vendorId: 15, name: "Dumbbell Set (5kg)", price: 8000, image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=300&fit=crop", category: "Weights" },
    
    // 7Linkz Phone Village (id: 19) - NEW
    { id: 1901, vendorId: 19, name: "iPhone 12 (128GB)", price: 450000, image: "https://images.unsplash.com/photo-1603921326210-6edd2d60ca68?w=400&h=300&fit=crop", category: "Smartphones" },
    { id: 1902, vendorId: 19, name: "Samsung Galaxy A54", price: 320000, image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=300&fit=crop", category: "Smartphones" },
    { id: 1903, vendorId: 19, name: "AirPods Pro", price: 85000, image: "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=400&h=300&fit=crop", category: "Audio" },
    { id: 1904, vendorId: 19, name: "Laptop HP Pavilion", price: 550000, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop", category: "Computers" },
    
    // SmartGadgets NG (id: 20) - NEW
    { id: 2001, vendorId: 20, name: "Phone Case (Universal)", price: 1500, image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=300&fit=crop", category: "Accessories" },
    { id: 2002, vendorId: 20, name: "Screen Protector", price: 1000, image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=300&fit=crop", category: "Accessories" },
    { id: 2003, vendorId: 20, name: "USB-C Cable", price: 2000, image: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&h=300&fit=crop", category: "Accessories" },
    { id: 2004, vendorId: 20, name: "Selfie Ring Light", price: 6500, image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop", category: "Photography" },
    
    // Book Haven Abeokuta (id: 21) - NEW
    { id: 2101, vendorId: 21, name: "Chemistry Textbook (SS3)", price: 3500, image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=300&fit=crop", category: "Education" },
    { id: 2102, vendorId: 21, name: "English Dictionary", price: 2500, image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=300&fit=crop", category: "Reference" },
    { id: 2103, vendorId: 21, name: "Exercise Book (40 Leaves)", price: 200, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop", category: "Stationery" },
    { id: 2104, vendorId: 21, name: "Novel: Purple Hibiscus", price: 4000, image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop", category: "Fiction" },
  ],
};
