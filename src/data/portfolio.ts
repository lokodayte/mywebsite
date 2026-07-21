export const portfolioData = {
  personalInfo: {
    name: "Boris Sargsyan",
    headline: "Cybersecurity Student, Builder, and Technology Enthusiast",
    bio: "Welcome to my digital portfolio. I am dedicated to securing digital frontiers, building robust systems, and constantly learning new technologies.",
    email: "boris@example.com",
    github: "https://github.com/borissargsyan",
    linkedin: "https://linkedin.com/in/borissargsyan",
  },
  projects: [
    {
      id: "project-1",
      title: "Secure Comm Platform",
      slug: "secure-comm-platform",
      short_summary: "An end-to-end encrypted messaging application built with modern web technologies.",
      full_description: "A comprehensive project focusing on secure communication protocols, featuring real-time messaging, zero-knowledge encryption, and a sleek user interface.",
      category: "Cybersecurity",
      technologies: ["Next.js", "TypeScript", "WebRTC", "AES-256", "Tailwind CSS"],
      github_link: "https://github.com",
      live_link: "https://example.com",
      is_featured: true,
      featured_image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: "project-2",
      title: "Network Traffic Analyzer",
      slug: "network-traffic-analyzer",
      short_summary: "A lightweight CLI tool for parsing and analyzing local network packets in real-time.",
      full_description: "Built to detect anomalous network patterns and log suspicious activities. Features a fast packet capture engine and customizable alert thresholds.",
      category: "Networking",
      technologies: ["Python", "Scapy", "Pandas", "Wireshark CLI"],
      github_link: "https://github.com",
      is_featured: true,
      featured_image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: "project-3",
      title: "Portfolio Website v1",
      slug: "portfolio-website",
      short_summary: "My personal digital portfolio built with React and Tailwind CSS.",
      full_description: "A fast, responsive, and accessible personal website showcasing my projects, skills, and professional journey.",
      category: "Web Development",
      technologies: ["React", "Tailwind CSS", "Vite", "Framer Motion"],
      github_link: "https://github.com",
      live_link: "https://example.com",
      is_featured: false,
      featured_image: null
    }
  ],
  education: [
    {
      id: "edu-1",
      institution: "Marist University",
      degree: "B.S. in Cybersecurity",
      location: "New York, USA",
      start_date: "2023",
      graduation_date: "2027",
      description: "Focusing on ethical hacking, network security, and cryptography."
    },
    {
      id: "edu-2",
      institution: "UWC Dilijan",
      degree: "International Baccalaureate",
      location: "Dilijan, Armenia",
      start_date: "2021",
      graduation_date: "2023",
      description: "International education with a strong emphasis on cross-cultural understanding and rigorous academics."
    }
  ]
};
