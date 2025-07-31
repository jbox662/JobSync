import { useJobStore } from '../state/store';

export const initializeMockData = () => {
  const store = useJobStore.getState();
  
  // Only add mock data if there's no existing data
  if (store.customers.length === 0) {
    // Add mock customers
    store.addCustomer({
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567',
      company: 'Smith Construction',
      address: '123 Main St, Springfield, IL 62701'
    });
    
    store.addCustomer({
      name: 'Sarah Johnson',
      email: 'sarah@techcorp.com',
      phone: '(555) 987-6543',
      company: 'TechCorp Inc',
      address: '456 Oak Ave, Chicago, IL 60601'
    });

    store.addCustomer({
      name: 'Mike Wilson',
      email: 'mike.wilson@gmail.com',
      phone: '(555) 555-0123',
      company: 'Wilson Enterprises'
    });
  }

  if (store.parts.length === 0) {
    // Add mock parts
    store.addPart({
      name: 'Copper Pipe 1/2"',
      description: 'Standard copper pipe for plumbing',
      unitPrice: 12.50,
      stock: 25,
      sku: 'CP-050',
      category: 'Plumbing'
    });

    store.addPart({
      name: 'LED Light Fixture',
      description: 'Energy efficient LED ceiling light',
      unitPrice: 89.99,
      stock: 12,
      sku: 'LED-CF-001',
      category: 'Electrical'
    });

    store.addPart({
      name: 'HVAC Filter',
      description: 'High efficiency air filter',
      unitPrice: 24.99,
      stock: 18,
      sku: 'HVAC-F-16X25',
      category: 'HVAC'
    });
  }

  if (store.laborItems.length === 0) {
    // Add mock labor items
    store.addLaborItem({
      description: 'General Labor',
      hourlyRate: 65.00,
      category: 'General'
    });

    store.addLaborItem({
      description: 'Electrical Work',
      hourlyRate: 85.00,
      category: 'Electrical'
    });

    store.addLaborItem({
      description: 'Plumbing Installation',
      hourlyRate: 75.00,
      category: 'Plumbing'
    });
  }

  if (store.jobs.length === 0) {
    const customers = store.customers;
    if (customers.length > 0) {
      // Add mock jobs
      store.addJob({
        customerId: customers[0].id,
        title: 'Kitchen Renovation',
        description: 'Complete kitchen renovation including plumbing and electrical work',
        status: 'in-progress',
        items: [],
        taxRate: 8.25,
        tax: 0,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
      });

      store.addJob({
        customerId: customers[1].id,
        title: 'Office Lighting Upgrade',
        description: 'Replace all office lighting with LED fixtures',
        status: 'quote',
        items: [],
        taxRate: 8.25,
        tax: 0,
      });

      store.addJob({
        customerId: customers[0].id,
        title: 'Bathroom Repair',
        description: 'Fix leaking pipes and replace fixtures',
        status: 'completed',
        items: [],
        taxRate: 8.25,
        tax: 0,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      });
    }
  }
};