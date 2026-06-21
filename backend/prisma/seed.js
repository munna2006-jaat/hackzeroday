import { PrismaClient } from "@prisma/client";
import { hashSecret } from "../src/utils/auth.js";

const prisma = new PrismaClient();

const DEMO_PATHS = [
  {
    slug: "pre-security",
    title: "Pre Security",
    description:
      "Before hacking anything, learn networking basics, how the web works, and Linux fundamentals. Perfect for absolute beginners.",
    difficulty: "beginner",
    coverImage: "assets/paths/pre-security.png",
    hours: 40,
    order: 0,
    modules: [
      { slug: "networking-basics", title: "Networking Basics", order: 0 },
      { slug: "web-fundamentals-mod", title: "Web Fundamentals", order: 1 },
      { slug: "linux-intro", title: "Linux Introduction", order: 2 }
    ]
  },
  {
    slug: "cyber-101",
    title: "Cyber Security 101",
    description:
      "Essential cybersecurity concepts — threats, vulnerabilities, cryptography, and operating system security explained clearly.",
    difficulty: "beginner",
    coverImage: "assets/paths/cyber-101.png",
    hours: 64,
    order: 1,
    modules: [
      { slug: "security-foundations", title: "Security Foundations", order: 0 },
      { slug: "cryptography-mod", title: "Cryptography", order: 1 }
    ]
  },
  {
    slug: "web-hacking",
    title: "Web Application Pentesting",
    description:
      "Master web security — OWASP Top 10, Burp Suite, SQL injection, XSS, SSRF, and professional vulnerability reporting.",
    difficulty: "intermediate",
    coverImage: "assets/paths/web-hacking.png",
    hours: 48,
    order: 2,
    modules: [{ slug: "web-attacks", title: "Web Attacks", order: 0 }]
  }
];

const DEMO_ROOMS = [
  {
    slug: "intro-to-cyber",
    title: "Intro to Cyber Security",
    difficulty: "easy",
    duration: "1h",
    tasksCount: 1,
    description: "Your first room! Learn what cybersecurity is and why it matters.",
    moduleSlug: "security-foundations",
    order: 0
  },
  {
    slug: "linux-fundamentals",
    title: "Linux Fundamentals Part 1",
    difficulty: "easy",
    duration: "2h",
    tasksCount: 1,
    description: "Get comfortable with the Linux command line — essential for every hacker.",
    moduleSlug: "linux-intro",
    order: 0
  },
  {
    slug: "networking-nmap",
    title: "Intro to Networking",
    difficulty: "easy",
    duration: "1.5h",
    tasksCount: 1,
    description: "Understand how devices communicate and how attackers scan networks.",
    moduleSlug: "networking-basics",
    order: 0
  },
  {
    slug: "web-fundamentals",
    title: "Web Fundamentals",
    difficulty: "easy",
    duration: "2h",
    tasksCount: 1,
    description: "Learn how websites work — HTTP, DNS, and the building blocks of the web.",
    moduleSlug: "web-fundamentals-mod",
    order: 0
  },
  {
    slug: "owasp-top10",
    title: "OWASP Top 10",
    difficulty: "medium",
    duration: "3h",
    tasksCount: 1,
    description: "Explore the most critical web application security risks.",
    moduleSlug: "web-attacks",
    order: 0
  },
  {
    slug: "sql-injection",
    title: "SQL Injection",
    difficulty: "medium",
    duration: "2h",
    tasksCount: 1,
    description: "Learn to find and exploit SQL injection flaws in web applications.",
    moduleSlug: "web-attacks",
    order: 1
  },
  {
    slug: "cryptography",
    title: "Cryptography for Hackers",
    difficulty: "medium",
    duration: "2h",
    tasksCount: 1,
    description: "Decode ciphers, crack hashes, and understand encryption fundamentals.",
    moduleSlug: "cryptography-mod",
    order: 0
  }
];

async function main() {
  const existing = await prisma.learningPath.count();
  if (existing > 0) {
    console.log("Seed skipped: content already exists.");
    return;
  }

  const moduleIdBySlug = new Map();

  for (const pathData of DEMO_PATHS) {
    const { modules, ...pathFields } = pathData;
    const path = await prisma.learningPath.create({
      data: {
        ...pathFields,
        status: "PUBLISHED"
      }
    });

    for (const mod of modules) {
      let moduleRecord = await prisma.module.findUnique({ where: { slug: mod.slug } });
      if (!moduleRecord) {
        moduleRecord = await prisma.module.create({
          data: {
            slug: mod.slug,
            title: mod.title,
            order: mod.order
          }
        });
      }

      moduleIdBySlug.set(mod.slug, moduleRecord.id);

      await prisma.pathModule.create({
        data: {
          pathId: path.id,
          moduleId: moduleRecord.id,
          order: mod.order
        }
      });
    }
  }

  for (const room of DEMO_ROOMS) {
    const moduleId = moduleIdBySlug.get(room.moduleSlug);
    if (!moduleId) {
      console.warn(`Skipping room ${room.slug}: module ${room.moduleSlug} not found.`);
      continue;
    }

    await prisma.room.create({
      data: {
        slug: room.slug,
        title: room.title,
        description: room.description,
        difficulty: room.difficulty,
        duration: room.duration,
        tasksCount: room.tasksCount,
        order: room.order,
        moduleId,
        status: "PUBLISHED",
        tasks: {
          create: {
            title: "Getting started",
            contentHtml: `<p>${room.description}</p><p>Read the prompt below and submit the demo answer to verify the room flow.</p>`,
            order: 0,
            questions: {
              create: {
                blockId: "demo-question-1",
                type: "TEXT",
                prompt: "Type ready to complete this task.",
                answerHash: await hashSecret("ready"),
                order: 0
              }
            }
          }
        }
      }
    });
  }

  console.log("Demo CMS content seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
