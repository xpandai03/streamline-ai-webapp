"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "What is Streamline?",
    answer:
      "Streamline builds multimodal AI agents that can understand, search, and edit videos. Our platform helps you transform long-form content into viral-ready clips automatically.",
  },
  {
    question: "Who can benefit from Streamline?",
    answer:
      "If you create long-form video or audio content, Streamline is designed for you. Whether you're a media company, streamer, YouTuber, or podcaster, our AI agent continuously monitors your content and creates viral-ready clips within minutes. Do in seconds what used to take you hours.",
  },
  {
    question: "Do I retain ownership of my content?",
    answer:
      "Absolutely. You maintain full ownership and control over all the content you produce. Streamline simply provides the AI tools to help you manage, edit, and share your content more efficiently.",
  },
  {
    question: "How quickly can I get started with Streamline?",
    answer:
      "Implementation is straightforward. Our sales team will do step-by-step onboarding and integration support to get you up and running quickly—often within a few days.",
  },
  {
    question: "How does Streamline handle privacy and security?",
    answer:
      "Enterprise-Grade Standards: We prioritize data privacy and security at every level of our platform, adhering to enterprise-grade best practices. Secure Architecture: Our systems employ robust encryption protocols both in transit and at rest, safeguarding your content and personal information. Access Controls: We enforce strict role-based access controls to ensure only authorized team members can view or modify your data.",
  },
  {
    question: "Where can I learn more or request a demo?",
    answer:
      "If you'd like to see Streamline in action or learn more about customizing a solution for your needs, please schedule a demo or reach out to our support team.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-20 px-4">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-sans mb-6 leading-snug text-balance"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="font-bold text-white">Frequently Asked Questions.</span>{" "}
            <span className="font-normal text-gray-400">We've got answers.</span>
          </motion.h2>
          <motion.p
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto text-pretty"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Everything you need to know about Streamline. Can't find what you're looking for? Contact our support team.
          </motion.p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="border border-border/20 rounded-lg bg-card/50 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors rounded-lg"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg font-medium text-white pr-4">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: openIndex === index ? "auto" : 0,
                  opacity: openIndex === index ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4">
                  <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        ></motion.div>
      </div>
    </section>
  )
}
