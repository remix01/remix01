import { PrismaClient, UserRole, JobStatus, PaymentStatus, PackageType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data (in development only!)
  await prisma.message.deleteMany()
  await prisma.violation.deleteMany()
  await prisma.riskScore.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.job.deleteMany()
  await prisma.craftworkerProfile.deleteMany()
  await prisma.user.deleteMany()

  // ══════════════════════════════════════════════════════════════
  // Create Users
  // ══════════════════════════════════════════════════════════════

  // Customers
  const customer1 = await prisma.user.create({
    data: {
      email: 'marko.novak@gmail.com',
      phone: '+386 41 123 456', // In production, this would be encrypted
      name: 'Marko Novak',
      role: UserRole.CUSTOMER,
      stripeCustomerId: 'cus_test_customer1',
    },
  })

  const customer2 = await prisma.user.create({
    data: {
      email: 'ana.kovac@gmail.com',
      phone: '+386 31 987 654',
      name: 'Ana Kovač',
      role: UserRole.CUSTOMER,
      stripeCustomerId: 'cus_test_customer2',
    },
  })

  // Craftworkers
  const craftworker1 = await prisma.user.create({
    data: {
      email: 'janez.vodoinstalater@liftgo.net',
      phone: '+386 40 111 222',
      name: 'Janez Horvat',
      role: UserRole.CRAFTWORKER,
      stripeCustomerId: 'cus_test_craftworker1',
      craftworkerProfile: {
        create: {
          packageType: PackageType.PRO,
          commissionRate: 0.10, // 10% for PRO
          stripeAccountId: 'acct_test_craftworker1',
          stripeOnboardingComplete: true,
          totalJobsCompleted: 47,
          avgRating: 4.8,
          isVerified: true,
          verifiedAt: new Date('2025-01-15'),
          loyaltyPoints: 2350,
        },
      },
    },
  })

  const craftworker2 = await prisma.user.create({
    data: {
      email: 'petra.elektro@liftgo.net',
      phone: '+386 51 333 444',
      name: 'Petra Zupan',
      role: UserRole.CRAFTWORKER,
      craftworkerProfile: {
        create: {
          packageType: PackageType.START,
          commissionRate: 0.15, // 15% for START
          stripeAccountId: 'acct_test_craftworker2',
          stripeOnboardingComplete: true,
          totalJobsCompleted: 23,
          avgRating: 4.6,
          isVerified: true,
          verifiedAt: new Date('2025-06-10'),
          loyaltyPoints: 1150,
        },
      },
    },
  })

  const craftworker3 = await prisma.user.create({
    data: {
      email: 'david.mizar@liftgo.net',
      phone: '+386 70 555 666',
      name: 'David Kranjc',
      role: UserRole.CRAFTWORKER,
      craftworkerProfile: {
        create: {
          packageType: PackageType.START,
          commissionRate: 0.15,
          stripeAccountId: 'acct_test_craftworker3',
          stripeOnboardingComplete: false, // New craftworker, onboarding not complete
          totalJobsCompleted: 5,
          avgRating: 4.9,
          isVerified: false,
          loyaltyPoints: 250,
          bypassWarnings: 1, // Has one warning
        },
      },
    },
  })

  console.log('✅ Created 2 customers and 3 craftworkers')

  // ══════════════════════════════════════════════════════════════
  // Create Jobs
  // ══════════════════════════════════════════════════════════════

  // Job 1: Completed job
  const job1 = await prisma.job.create({
    data: {
      title: 'Popravilo puščajoče pipe v kopalnici',
      description: 'Imam težavo s puščajočo pipo v kopalnici. Potrebujem hitro popravilo.',
      category: 'vodoinstalater',
      city: 'Ljubljana',
      estimatedValue: 150.00,
      status: JobStatus.COMPLETED,
      customerId: customer1.id,
      craftworkerId: craftworker1.id,
      twilioConversationSid: 'CH_completed_job_conversation_1',
      completedAt: new Date('2026-02-10'),
      payment: {
        create: {
          amount: 150.00,
          platformFee: 15.00, // 10% PRO commission
          craftworkerPayout: 135.00,
          status: PaymentStatus.RELEASED,
          stripePaymentIntentId: 'pi_test_completed_1',
          stripeTransferId: 'tr_test_1',
          heldAt: new Date('2026-02-05'),
          releasedAt: new Date('2026-02-10'),
        },
      },
      conversation: {
        create: {
          twilioConversationSid: 'CH_completed_job_conversation_1',
          status: 'CLOSED',
          participantCustomerSid: 'MB_customer_1',
          participantCraftworkerSid: 'MB_craftworker_1',
          contactRevealedAt: new Date('2026-02-10'), // Contact revealed after payment
          lastMessageAt: new Date('2026-02-10'),
          closedAt: new Date('2026-02-11'),
        },
      },
    },
  })

  // Job 2: In progress with payment held
  const job2 = await prisma.job.create({
    data: {
      title: 'Montaža električne omarice',
      description: 'Potrebujem montažo nove električne omarice in pregled obstoječe napeljave.',
      category: 'elektrikar',
      city: 'Maribor',
      estimatedValue: 450.00,
      status: JobStatus.IN_PROGRESS,
      customerId: customer2.id,
      craftworkerId: craftworker2.id,
      twilioConversationSid: 'CH_active_job_conversation_2',
      payment: {
        create: {
          amount: 450.00,
          platformFee: 67.50, // 15% START commission
          craftworkerPayout: 382.50,
          status: PaymentStatus.HELD,
          stripePaymentIntentId: 'pi_test_held_2',
          heldAt: new Date('2026-02-14'),
        },
      },
      conversation: {
        create: {
          twilioConversationSid: 'CH_active_job_conversation_2',
          status: 'ACTIVE',
          participantCustomerSid: 'MB_customer_2',
          participantCraftworkerSid: 'MB_craftworker_2',
          lastMessageAt: new Date(),
        },
      },
    },
  })

  // Job 3: Matched, waiting to start
  const job3 = await prisma.job.create({
    data: {
      title: 'Izdelava omare po meri',
      description: 'Potrebujem omaro po meri za predsoblju, dimenzije 2m x 2.5m.',
      category: 'mizar',
      city: 'Celje',
      estimatedValue: 800.00,
      status: JobStatus.MATCHED,
      customerId: customer1.id,
      craftworkerId: craftworker3.id,
      twilioConversationSid: 'CH_matched_job_conversation_3',
      conversation: {
        create: {
          twilioConversationSid: 'CH_matched_job_conversation_3',
          status: 'ACTIVE',
          participantCustomerSid: 'MB_customer_1_alt',
          participantCraftworkerSid: 'MB_craftworker_3',
          lastMessageAt: new Date(),
        },
      },
    },
  })

  // Job 4: Pending - no craftworker assigned yet
  const job4 = await prisma.job.create({
    data: {
      title: 'Obnova fasade hiše',
      description: 'Potrebujem obnovo fasade na hiši (120m2). Zanima me ocena stroškov.',
      category: 'fasader',
      city: 'Kranj',
      estimatedValue: 3500.00,
      status: JobStatus.PENDING,
      customerId: customer2.id,
    },
  })

  // Job 5: Disputed job with violation
  const job5 = await prisma.job.create({
    data: {
      title: 'Popravilo strehe',
      description: 'Hitro potrebujem popravilo strešne kritine.',
      category: 'kleparstvo',
      city: 'Ljubljana',
      estimatedValue: 600.00,
      status: JobStatus.DISPUTED,
      customerId: customer1.id,
      craftworkerId: craftworker3.id,
      twilioConversationSid: 'CH_disputed_job_conversation_5',
      riskScore: 65, // High risk score due to violations
      payment: {
        create: {
          amount: 600.00,
          platformFee: 90.00,
          craftworkerPayout: 510.00,
          status: PaymentStatus.DISPUTED,
          stripePaymentIntentId: 'pi_test_disputed_5',
          heldAt: new Date('2026-02-12'),
          disputeReason: 'Craftworker attempted to bypass platform',
        },
      },
      conversation: {
        create: {
          twilioConversationSid: 'CH_disputed_job_conversation_5',
          status: 'SUSPENDED',
          participantCustomerSid: 'MB_customer_1_job5',
          participantCraftworkerSid: 'MB_craftworker_3_job5',
          lastMessageAt: new Date('2026-02-13'),
        },
      },
      violations: {
        create: {
          userId: craftworker3.id,
          type: 'PHONE_DETECTED',
          severity: 'HIGH',
          detectedContent: 'Message contained: "pokliči me na 040-***-***"',
          isReviewed: true,
          reviewedBy: 'admin_user_id',
          reviewedAt: new Date('2026-02-13'),
          actionTaken: 'Conversation suspended, craftworker warned',
        },
      },
      riskScore: {
        create: {
          score: 65,
          flags: ['phone_detected', 'bypass_attempt', 'rapid_messaging'],
          triggeredAlert: true,
        },
      },
    },
  })

  console.log('✅ Created 5 jobs with various statuses')

  // ══════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════

  const userCount = await prisma.user.count()
  const jobCount = await prisma.job.count()
  const paymentCount = await prisma.payment.count()
  const conversationCount = await prisma.conversation.count()
  const violationCount = await prisma.violation.count()

  console.log('\n📊 Seed Summary:')
  console.log(`   Users: ${userCount}`)
  console.log(`   Jobs: ${jobCount}`)
  console.log(`   Payments: ${paymentCount}`)
  console.log(`   Conversations: ${conversationCount}`)
  console.log(`   Violations: ${violationCount}`)
  console.log('\n✨ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
