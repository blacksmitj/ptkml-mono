import "dotenv/config";
import prisma from "../src/lib/prisma";
import {
  GlobalRole,
  Gender,
  WorkspaceRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  const isProduction = process.env.NODE_ENV === "production";

  let passwordHash: string | null = null;
  let adminPasswordHash: string | null = null;

  if (isProduction) {
    console.log(
      "🔒 Running in PRODUCTION mode. User passwords will be set to NULL (SSO login only).",
    );
  } else {
    const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "password123";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";

    if (
      !process.env.SEED_DEFAULT_PASSWORD ||
      !process.env.SEED_ADMIN_PASSWORD
    ) {
      console.warn(
        "⚠️  WARNING: SEED_DEFAULT_PASSWORD or SEED_ADMIN_PASSWORD environment variables are not set.",
      );
      console.warn(
        "   Using default development passwords ('password123' and 'admin123').",
      );
      console.warn("   DO NOT DO THIS IN PRODUCTION/VPS DEPLOYMENTS!");
    }

    passwordHash = await bcrypt.hash(defaultPassword, 10);
    adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  }

  // 1. Ensure a Workspace exists
  console.log("   - Setting up Workspace...");
  const workspace = await prisma.workspace.upsert({
    where: { id: "default-workspace-id" },
    update: {},
    create: {
      id: "default-workspace-id",
      name: "Workspace Pendampingan 2026",
      year: 2026,
      code: "WP2026",
      isActive: true,
    },
  });

  // 2. Ensure a University exists
  console.log("   - Setting up University...");
  const university = await prisma.university.upsert({
    where: { id: "default-university-id" },
    update: {},
    create: {
      id: "default-university-id",
      name: "Universitas Indonesia",
      logo: null,
      isActive: true,
    },
  });

  // Connect University to Workspace via WorkspaceUniversity join table
  console.log("   - Connecting University to Workspace...");
  await prisma.workspaceUniversity.upsert({
    where: {
      workspaceId_universityId: {
        workspaceId: workspace.id,
        universityId: university.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      universityId: university.id,
    },
  });

  // 3. Create Super Admin
  console.log("   - Setting up Super Admin...");
  const adminProfile = await prisma.profile.upsert({
    where: { email: "admin@tkml.id" },
    update: {
      name: "Super Admin",
      nik: "0000000000000000",
      birthPlace: "Jakarta",
      birthDate: new Date("1990-01-01"),
      gender: Gender.MALE,
      whatsapp: "08123456789",
    },
    create: {
      id: "admin-profile-id",
      name: "Super Admin",
      nik: "0000000000000000",
      birthPlace: "Jakarta",
      birthDate: new Date("1990-01-01"),
      gender: Gender.MALE,
      email: "admin@tkml.id",
      whatsapp: "08123456789",
    },
  });

  await prisma.user.upsert({
    where: { id: "admin-user-id" },
    update: {
      username: "superadmin",
      password: adminPasswordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
      profileId: adminProfile.id,
    },
    create: {
      id: "admin-user-id",
      username: "superadmin",
      password: adminPasswordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
      profileId: adminProfile.id,
    },
  });

  // 4. Create Global Supervisor (WORKSPACE_SUPERVISOR)
  console.log("   - Setting up Global Supervisor...");
  const supervisorProfile = await prisma.profile.upsert({
    where: { email: "supervisor@tkml.id" },
    update: {
      name: "Global Supervisor",
      nik: "1111111111111111",
      birthPlace: "Bandung",
      birthDate: new Date("1985-05-15"),
      gender: Gender.FEMALE,
      whatsapp: "08123456788",
    },
    create: {
      id: "supervisor-profile-id",
      name: "Global Supervisor",
      nik: "1111111111111111",
      birthPlace: "Bandung",
      birthDate: new Date("1985-05-15"),
      gender: Gender.FEMALE,
      email: "supervisor@tkml.id",
      whatsapp: "08123456788",
    },
  });

  await prisma.user.upsert({
    where: { id: "supervisor-user-id" },
    update: {
      username: "supervisor",
      password: passwordHash,
      globalRole: GlobalRole.WORKSPACE_SUPERVISOR,
      profileId: supervisorProfile.id,
    },
    create: {
      id: "supervisor-user-id",
      username: "supervisor",
      password: passwordHash,
      globalRole: GlobalRole.WORKSPACE_SUPERVISOR,
      profileId: supervisorProfile.id,
    },
  });

  // Helper function to create workspace member users
  async function createWorkspaceMemberUser(
    username: string,
    email: string,
    name: string,
    nik: string,
    role: WorkspaceRole,
    univId: string | null,
  ) {
    console.log(`   - Setting up ${username} (${role})...`);
    const profile = await prisma.profile.upsert({
      where: { email },
      update: {
        name,
        nik,
        whatsapp: "08123456780",
      },
      create: {
        id: `${username}-profile-id`,
        name,
        nik,
        birthPlace: "Surabaya",
        birthDate: new Date("1988-08-08"),
        gender: Gender.MALE,
        email,
        whatsapp: "08123456780",
      },
    });

    const user = await prisma.user.upsert({
      where: { id: `${username}-user-id` },
      update: {
        username,
        password: passwordHash,
        profileId: profile.id,
      },
      create: {
        id: `${username}-user-id`,
        username,
        password: passwordHash,
        globalRole: GlobalRole.USER,
        profileId: profile.id,
      },
    });

    // Check if membership already exists
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: user.id,
        role: role,
      },
    });

    if (!existingMember) {
      await prisma.workspaceMember.create({
        data: {
          id: `${username}-member-id`,
          workspaceId: workspace.id,
          userId: user.id,
          universityId: univId,
          role: role,
          verificationStatus: "APPROVED",
        },
      });
    } else if (existingMember.universityId !== univId) {
      await prisma.workspaceMember.update({
        where: { id: existingMember.id },
        data: { universityId: univId },
      });
    }
  }

  // 5. Create University Admin
  await createWorkspaceMemberUser(
    "univadmin",
    "univadmin@tkml.id",
    "Admin Universitas",
    "2222222222222222",
    WorkspaceRole.UNIVERSITY_ADMIN,
    university.id,
  );

  // 6. Create University Supervisor
  await createWorkspaceMemberUser(
    "univsupervisor",
    "univsupervisor@tkml.id",
    "Supervisor Universitas",
    "3333333333333333",
    WorkspaceRole.UNIVERSITY_SUPERVISOR,
    university.id,
  );

  // 7. Create Mentor
  await createWorkspaceMemberUser(
    "mentor",
    "mentor@tkml.id",
    "Mentor Pendamping",
    "4444444444444444",
    WorkspaceRole.MENTOR,
    university.id,
  );

  // 8. Seed Default Dashboard Events
  console.log("   - Setting up Dashboard Events...");
  await prisma.dashboardEvent.upsert({
    where: { id: "event-tanggal-18" },
    update: {},
    create: {
      id: "event-tanggal-18",
      workspaceId: workspace.id,
      title: "Pengumpulan Capaian Output Data Awal",
      description:
        "Pengingat bahwa setiap tanggal 18 harus sudah menyelesaikan seluruh capaian output data awal dan bulan pertama.",
      recurrenceType: "MONTHLY_DAY",
      dayOfMonth: 18,
      activeDaysBefore: 30, // set generous range for testing
      activeDaysAfter: 5,
      actionUrl: "/logbooks",
      actionLabel: "Isi Capaian Sekarang",
      targetRole: "MENTOR",
      isActive: true,
    },
  });

  await prisma.dashboardEvent.upsert({
    where: { id: "event-tanggal-23" },
    update: {},
    create: {
      id: "event-tanggal-23",
      workspaceId: workspace.id,
      title: "Penyerahan Laporan Periode 1-22",
      description:
        "Pengingat bahwa setiap tanggal 23 harus menyerahkan laporan dari tanggal 1-22.",
      recurrenceType: "MONTHLY_DAY",
      dayOfMonth: 23,
      activeDaysBefore: 30, // set generous range for testing
      activeDaysAfter: 5,
      actionUrl: "/logbooks",
      actionLabel: "Serahkan Laporan",
      targetRole: "MENTOR",
      isActive: true,
    },
  });

  console.log("✅ Seeding complete!");
  if (isProduction) {
    console.log("Credentials status:");
    console.log(" - Local Password Logins: DISABLED (SSO Login Only)");
  } else {
    console.log("Credentials:");
    console.log(
      ` - Super Admin: superadmin / ${process.env.SEED_ADMIN_PASSWORD ? "[Configured in Env]" : "admin123"}`,
    );
    console.log(
      ` - Global Supervisor: supervisor / ${process.env.SEED_DEFAULT_PASSWORD ? "[Configured in Env]" : "password123"}`,
    );
    console.log(
      ` - University Admin: univadmin / ${process.env.SEED_DEFAULT_PASSWORD ? "[Configured in Env]" : "password123"}`,
    );
    console.log(
      ` - University Supervisor: univsupervisor / ${process.env.SEED_DEFAULT_PASSWORD ? "[Configured in Env]" : "password123"}`,
    );
    console.log(
      ` - Mentor: mentor / ${process.env.SEED_DEFAULT_PASSWORD ? "[Configured in Env]" : "password123"}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
