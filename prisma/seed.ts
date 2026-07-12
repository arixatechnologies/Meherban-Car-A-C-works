import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  EstimateStatus,
  InspectionStatus,
  InvoicePaymentStatus,
  ItemCategory,
  JobCardStatus,
  PaymentMode,
  Prisma,
  PrismaClient,
  Priority,
  StaffStatus,
  UserRole,
  WhatsAppMessageType,
  WhatsAppSendMethod,
  WhatsAppStatus,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const inspectionNames = [
  "Compressor",
  "Condenser",
  "Cooling coil / evaporator",
  "Blower motor",
  "Cabin filter",
  "Gas pressure",
  "Leakage test",
  "Electrical wiring",
  "Fan working",
  "Belt condition",
  "Cooling temperature",
  "Vent air flow",
];

function money(value: number) {
  return new Prisma.Decimal(value);
}

function token(label: string) {
  return `${label}-${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

async function main() {
  await prisma.whatsAppLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.estimateItem.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.jobCardStatusLog.deleteMany();
  await prisma.jobCardInspectionItem.deleteMany();
  await prisma.jobCardPhoto.deleteMany();
  await prisma.jobCard.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workshopSetting.deleteMany();

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "meharbancaracwork@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Meharban@786";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.create({
    data: {
      name: "Meharban",
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const advisor = await prisma.user.create({
    data: {
      name: "Imran Khan",
      email: "advisor@meharbanacworks.com",
      passwordHash,
      role: UserRole.SERVICE_ADVISOR,
    },
  });

  const billing = await prisma.user.create({
    data: {
      name: "Billing Staff",
      email: "billing@meharbanacworks.com",
      passwordHash,
      role: UserRole.BILLING_STAFF,
    },
  });

  const [tech, assistantTech] = await Promise.all([
    prisma.staff.create({
      data: {
        name: "S. Imtiyaz",
        mobile: "9876543214",
        role: UserRole.TECHNICIAN,
        status: StaffStatus.ACTIVE,
        specialization: "Compressor and leakage diagnosis",
      },
    }),
    prisma.staff.create({
      data: {
        name: "M. Azeem",
        mobile: "9876543215",
        role: UserRole.TECHNICIAN,
        status: StaffStatus.ACTIVE,
        specialization: "Blower and cooling coil service",
      },
    }),
  ]);

  await prisma.staff.create({
    data: {
      name: "Imran Khan",
      mobile: "9876543213",
      email: "imran.staff@meharbanacworks.com",
      role: UserRole.SERVICE_ADVISOR,
      status: StaffStatus.ACTIVE,
      specialization: "Customer intake and estimate approval",
    },
  });

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Ramesh Kumar",
        mobile: "9876543210",
        whatsapp: "9876543210",
        city: "Hyderabad",
        address: "Kukatpally, Hyderabad",
      },
    }),
    prisma.customer.create({
      data: {
        name: "Suresh Reddy",
        mobile: "9876543211",
        whatsapp: "9876543211",
        city: "Visakhapatnam",
        address: "MVP Colony, Visakhapatnam",
      },
    }),
    prisma.customer.create({
      data: {
        name: "Imran Khan",
        mobile: "9876543212",
        whatsapp: "9876543212",
        city: "Hyderabad",
        address: "Mehdipatnam, Hyderabad",
      },
    }),
  ]);

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        customerId: customers[0].id,
        vehicleNumber: "TS09EX1234",
        brand: "Hyundai",
        model: "Creta",
        fuelType: "Diesel",
        year: 2021,
        odometerReading: 48200,
      },
    }),
    prisma.vehicle.create({
      data: {
        customerId: customers[1].id,
        vehicleNumber: "AP31AB5678",
        brand: "Maruti",
        model: "Swift",
        fuelType: "Petrol",
        year: 2019,
        odometerReading: 62150,
      },
    }),
    prisma.vehicle.create({
      data: {
        customerId: customers[2].id,
        vehicleNumber: "TS10CD7890",
        brand: "Tata",
        model: "Nexon",
        fuelType: "Diesel",
        year: 2022,
        odometerReading: 35800,
      },
    }),
  ]);

  const jobCards = await Promise.all([
    prisma.jobCard.create({
      data: {
        jobCardNumber: "JC-2026-0001",
        customerId: customers[0].id,
        vehicleId: vehicles[0].id,
        serviceAdvisorId: advisor.id,
        assignedTechnicianId: tech.id,
        expectedDeliveryAt: new Date("2026-07-08T18:00:00+05:30"),
        priority: Priority.NORMAL,
        trackingToken: token("track"),
        complaints: ["A/C not cooling", "Gas leakage"],
        problemFound: "Low gas pressure and minor condenser leakage.",
        workSuggested: "Leakage repair, vacuum test, gas filling, and cooling test.",
        partsRequired: "Condenser O-ring set",
        status: JobCardStatus.WORK_IN_PROGRESS,
      },
    }),
    prisma.jobCard.create({
      data: {
        jobCardNumber: "JC-2026-0002",
        customerId: customers[1].id,
        vehicleId: vehicles[1].id,
        serviceAdvisorId: advisor.id,
        assignedTechnicianId: assistantTech.id,
        expectedDeliveryAt: new Date("2026-07-07T19:00:00+05:30"),
        priority: Priority.HIGH,
        trackingToken: token("track"),
        complaints: ["Bad smell from vents", "Cooling low"],
        problemFound: "Cabin filter clogged and evaporator requires cleaning.",
        workSuggested: "Cooling coil cleaning and cabin filter replacement.",
        status: JobCardStatus.READY_FOR_DELIVERY,
      },
    }),
    prisma.jobCard.create({
      data: {
        jobCardNumber: "JC-2026-0003",
        customerId: customers[2].id,
        vehicleId: vehicles[2].id,
        serviceAdvisorId: advisor.id,
        assignedTechnicianId: tech.id,
        expectedDeliveryAt: new Date("2026-07-09T17:30:00+05:30"),
        priority: Priority.URGENT,
        trackingToken: token("track"),
        complaints: ["Blower not working", "Electrical issue"],
        problemFound: "Blower resistor fault suspected.",
        workSuggested: "Electrical diagnosis and blower circuit repair.",
        status: JobCardStatus.INSPECTION_STARTED,
      },
    }),
  ]);

  for (const jobCard of jobCards) {
    await prisma.jobCardInspectionItem.createMany({
      data: inspectionNames.map((name) => ({
        jobCardId: jobCard.id,
        name,
        status:
          name === "Gas pressure" || name === "Leakage test"
            ? InspectionStatus.ATTENTION
            : InspectionStatus.OK,
      })),
    });

    await prisma.jobCardStatusLog.createMany({
      data: [
        {
          jobCardId: jobCard.id,
          newStatus: JobCardStatus.VEHICLE_RECEIVED,
          updatedById: advisor.id,
          remarks: "Vehicle received and job card opened.",
        },
        {
          jobCardId: jobCard.id,
          oldStatus: JobCardStatus.VEHICLE_RECEIVED,
          newStatus: jobCard.status,
          updatedById: advisor.id,
          remarks: "Current demo status.",
        },
      ],
    });
  }

  await prisma.estimate.create({
    data: {
      estimateNumber: "EST-2026-0001",
      jobCardId: jobCards[0].id,
      customerId: customers[0].id,
      vehicleId: vehicles[0].id,
      serviceAdvisorId: advisor.id,
      problemSummary: "Leakage repair and gas filling required.",
      discount: money(200),
      totalAmount: money(6500),
      advanceReceived: money(1000),
      balanceAmount: money(5500),
      status: EstimateStatus.APPROVED,
      items: {
        create: [
          {
            description: "Leakage testing and repair",
            category: ItemCategory.SERVICE,
            quantity: money(1),
            unitPrice: money(1800),
            amount: money(1800),
          },
          {
            description: "A/C gas filling",
            category: ItemCategory.SERVICE,
            quantity: money(1),
            unitPrice: money(3200),
            amount: money(3200),
          },
          {
            description: "O-ring set",
            category: ItemCategory.PARTS,
            quantity: money(1),
            unitPrice: money(1700),
            amount: money(1700),
          },
        ],
      },
    },
  });

  await prisma.estimate.create({
    data: {
      estimateNumber: "EST-2026-0003",
      jobCardId: jobCards[2].id,
      customerId: customers[2].id,
      vehicleId: vehicles[2].id,
      serviceAdvisorId: advisor.id,
      problemSummary: "Electrical diagnosis and blower resistor work.",
      totalAmount: money(4200),
      balanceAmount: money(4200),
      status: EstimateStatus.SHARED,
      items: {
        create: [
          {
            description: "Electrical diagnosis",
            category: ItemCategory.LABOUR,
            quantity: money(1),
            unitPrice: money(1200),
            amount: money(1200),
          },
          {
            description: "Blower resistor replacement",
            category: ItemCategory.PARTS,
            quantity: money(1),
            unitPrice: money(3000),
            amount: money(3000),
          },
        ],
      },
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-0002",
      jobCardId: jobCards[1].id,
      customerId: customers[1].id,
      vehicleId: vehicles[1].id,
      serviceAdvisorId: billing.id,
      discount: money(300),
      totalAmount: money(8500),
      paidAmount: money(8500),
      balanceAmount: money(0),
      paymentStatus: InvoicePaymentStatus.PAID,
      deliveryStatus: "Ready for delivery",
      notes: "Cooling test completed successfully.",
      items: {
        create: [
          {
            description: "Cooling coil cleaning",
            category: ItemCategory.SERVICE,
            quantity: money(1),
            unitPrice: money(4500),
            amount: money(4500),
          },
          {
            description: "Cabin filter replacement",
            category: ItemCategory.PARTS,
            quantity: money(1),
            unitPrice: money(1800),
            amount: money(1800),
          },
          {
            description: "Blower service labour",
            category: ItemCategory.LABOUR,
            quantity: money(1),
            unitPrice: money(2500),
            amount: money(2500),
          },
        ],
      },
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        invoiceId: invoice.id,
        customerId: customers[1].id,
        amount: money(5000),
        mode: PaymentMode.UPI,
        referenceNumber: "UPI-DEMO-001",
        collectedById: billing.id,
      },
      {
        invoiceId: invoice.id,
        customerId: customers[1].id,
        amount: money(3500),
        mode: PaymentMode.CASH,
        collectedById: billing.id,
      },
    ],
  });

  await prisma.whatsAppLog.createMany({
    data: [
      {
        customerId: customers[0].id,
        jobCardId: jobCards[0].id,
        mobileNumber: "919876543210",
        messageType: WhatsAppMessageType.JOB_CARD_CREATED,
        messageBody: "Hello Ramesh Kumar, your vehicle TS09EX1234 has been received at Meharban Car A/C Works.",
        sendMethod: WhatsAppSendMethod.FALLBACK,
        status: WhatsAppStatus.PENDING,
      },
      {
        customerId: customers[1].id,
        jobCardId: jobCards[1].id,
        invoiceId: invoice.id,
        mobileNumber: "919876543211",
        messageType: WhatsAppMessageType.INVOICE_GENERATED,
        messageBody: "Hello Suresh Reddy, your service bill INV-2026-0002 has been generated.",
        sendMethod: WhatsAppSendMethod.MANUAL,
        status: WhatsAppStatus.MANUAL,
      },
    ],
  });

  await prisma.workshopSetting.create({
    data: {
      phoneNumber: "7287948037",
      whatsappNumber: "7287948037",
      email: "meharbancaracwork@gmail.com",
      address: "Pantulugarimeda, Beside Visakha Eye Hospital, Autonagar, Old Gajuwaka, Visakhapatnam - 26",
    },
  });

  console.log(`Seed data created. Admin login configured for ${adminEmail}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
