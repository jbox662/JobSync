import { useJobStore } from '../state/store';

export const generateMockData = () => {
  const { addCustomer, addPart, addLaborItem, addJob } = useJobStore.getState();
  
  // Add sample customers
  const customers = [
    {
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "(555) 123-4567",
      company: "Smith Construction",
      address: "123 Oak Street, Cityville, CA 90210"
    },
    {
      name: "Sarah Johnson",
      email: "sarah@modernhomes.com",
      phone: "(555) 987-6543",
      company: "Modern Homes LLC",
      address: "456 Pine Avenue, Townsburg, CA 90211"
    },
    {
      name: "Mike Rodriguez",
      email: "mike.rodriguez@gmail.com",
      phone: "(555) 456-7890",
      company: "Rodriguez Properties",
      address: "789 Maple Drive, Hillside, CA 90212"
    },
    {
      name: "Emily Chen",
      email: "emily.chen@techstartup.io",
      phone: "(555) 321-9876",
      company: "TechStartup Inc",
      address: "321 Innovation Blvd, Silicon Valley, CA 90213"
    }
  ];

  customers.forEach(customer => addCustomer(customer));

  // Add sample parts
  const parts = [
    {
      name: "Standard Door Handle",
      description: "Heavy-duty brass door handle with matching screws",
      unitPrice: 45.99,
      stock: 25,
      sku: "DH-001",
      category: "Hardware"
    },
    {
      name: "Kitchen Cabinet Hinge",
      description: "Soft-close cabinet hinge, 110-degree opening",
      unitPrice: 12.50,
      stock: 100,
      sku: "CH-002",
      category: "Hardware"
    },
    {
      name: "LED Light Fixture",
      description: "Modern LED ceiling fixture, 3000K warm white",
      unitPrice: 89.99,
      stock: 15,
      sku: "LED-003",
      category: "Lighting"
    },
    {
      name: "Paint - Interior White",
      description: "Premium interior paint, 1 gallon, semi-gloss",
      unitPrice: 32.95,
      stock: 50,
      sku: "PT-004",
      category: "Paint"
    },
    {
      name: "Ceramic Floor Tile",
      description: "12x12 ceramic floor tiles, beige color",
      unitPrice: 3.25,
      stock: 200,
      sku: "TL-005",
      category: "Flooring"
    },
    {
      name: "Window Lock",
      description: "Security window lock with key",
      unitPrice: 18.75,
      stock: 40,
      sku: "WL-006",
      category: "Security"
    }
  ];

  parts.forEach(part => addPart(part));

  // Add sample labor items
  const laborItems = [
    {
      description: "General Construction Labor",
      hourlyRate: 45.00,
      category: "Construction"
    },
    {
      description: "Electrical Installation",
      hourlyRate: 85.00,
      category: "Electrical"
    },
    {
      description: "Plumbing Services",
      hourlyRate: 75.00,
      category: "Plumbing"
    },
    {
      description: "Painting and Finishing",
      hourlyRate: 35.00,
      category: "Finishing"
    },
    {
      description: "Tile Installation",
      hourlyRate: 55.00,
      category: "Flooring"
    },
    {
      description: "Project Management",
      hourlyRate: 95.00,
      category: "Management"
    }
  ];

  laborItems.forEach(item => addLaborItem(item));

  // Get the added customers and parts to create jobs
  const store = useJobStore.getState();
  const addedCustomers = store.customers.slice(-customers.length);
  const addedParts = store.parts.slice(-parts.length);
  const addedLabor = store.laborItems.slice(-laborItems.length);

  // Create sample jobs with different statuses
  const jobs = [
    {
      customerId: addedCustomers[0].id,
      title: "Kitchen Renovation Project",
      description: "Complete kitchen renovation including cabinets, countertops, and lighting",
      status: "in-progress" as const,
      items: [
        {
          id: Date.now().toString() + "_1",
          type: "part" as const,
          itemId: addedParts.find(p => p.name === "Kitchen Cabinet Hinge")?.id || "",
          quantity: 20,
          unitPrice: 12.50,
          total: 250,
          description: "Kitchen Cabinet Hinge"
        },
        {
          id: Date.now().toString() + "_2",
          type: "part" as const,
          itemId: addedParts.find(p => p.name === "LED Light Fixture")?.id || "",
          quantity: 3,
          unitPrice: 89.99,
          total: 269.97,
          description: "LED Light Fixture"
        },
        {
          id: Date.now().toString() + "_3",
          type: "labor" as const,
          itemId: addedLabor.find(l => l.description === "General Construction Labor")?.id || "",
          quantity: 24,
          unitPrice: 45.00,
          total: 1080,
          description: "General Construction Labor"
        }
      ],
      taxRate: 8.25
    },
    {
      customerId: addedCustomers[1].id,
      title: "Office Space Painting",
      description: "Paint entire office space with modern color scheme",
      status: "quote" as const,
      items: [
        {
          id: Date.now().toString() + "_4",
          type: "part" as const,
          itemId: addedParts.find(p => p.name === "Paint - Interior White")?.id || "",
          quantity: 8,
          unitPrice: 32.95,
          total: 263.60,
          description: "Paint - Interior White"
        },
        {
          id: Date.now().toString() + "_5",
          type: "labor" as const,
          itemId: addedLabor.find(l => l.description === "Painting and Finishing")?.id || "",
          quantity: 16,
          unitPrice: 35.00,
          total: 560,
          description: "Painting and Finishing"
        }
      ],
      taxRate: 8.25
    },
    {
      customerId: addedCustomers[2].id,
      title: "Bathroom Floor Tiling",
      description: "Install ceramic tiles in master bathroom",
      status: "completed" as const,
      items: [
        {
          id: Date.now().toString() + "_6",
          type: "part" as const,
          itemId: addedParts.find(p => p.name === "Ceramic Floor Tile")?.id || "",
          quantity: 85,
          unitPrice: 3.25,
          total: 276.25,
          description: "Ceramic Floor Tile"
        },
        {
          id: Date.now().toString() + "_7",
          type: "labor" as const,
          itemId: addedLabor.find(l => l.description === "Tile Installation")?.id || "",
          quantity: 12,
          unitPrice: 55.00,
          total: 660,
          description: "Tile Installation"
        }
      ],
      taxRate: 8.25
    },
    {
      customerId: addedCustomers[3].id,
      title: "Security Upgrade",
      description: "Install new window locks throughout office building",
      status: "approved" as const,
      items: [
        {
          id: Date.now().toString() + "_8",
          type: "part" as const,
          itemId: addedParts.find(p => p.name === "Window Lock")?.id || "",
          quantity: 15,
          unitPrice: 18.75,
          total: 281.25,
          description: "Window Lock"
        },
        {
          id: Date.now().toString() + "_9",
          type: "labor" as const,
          itemId: addedLabor.find(l => l.description === "General Construction Labor")?.id || "",
          quantity: 8,
          unitPrice: 45.00,
          total: 360,
          description: "General Construction Labor"
        }
      ],
      taxRate: 8.25
    }
  ];

  jobs.forEach(jobData => {
    addJob({
      ...jobData,
      tax: 0 // Will be calculated by the store
    });
  });

  console.log("Mock data generated successfully!");
};