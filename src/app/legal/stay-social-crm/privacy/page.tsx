import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Stay Social CRM | Spencer Wozniak",
  description: "Privacy Policy for Stay Social CRM. Learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "https://www.spencerwozniak.com/legal/stay-social-crm/privacy",
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <article className="max-w-none">
        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">PRIVACY POLICY</h1>
        <p className="text-base mb-4 text-gray-600 dark:text-neutral-400">Last updated: December 06, 2025</p>
        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          This Privacy Policy describes how Serelora (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects,
          uses, and protects your personal information when you use Stay Social CRM, our web-based client management
          system. By using Stay Social CRM, you agree to the collection and use of information in accordance with this
          policy.
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          If you have questions about this Privacy Policy or how we handle your personal information, please contact us
          at{" "}
          <a href="mailto:legal@serelora.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            legal@serelora.com
          </a>
          .
        </p>

        <h2 className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">SUMMARY OF KEY POINTS</h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          This summary highlights the key points of our Privacy Policy. For more details, use the{" "}
          <a href="#toc" className="text-blue-600 dark:text-blue-400 hover:underline">
            table of contents
          </a>{" "}
          below or click the links in each section.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>What personal information do we collect?</strong> We collect information you provide when using Stay
          Social CRM, such as your name, email address, and contact details. We also collect information about how you
          use the application. Learn more about{" "}
          <a href="#personalinfo" className="text-blue-600 dark:text-blue-400 hover:underline">
            what information we collect
          </a>
          .
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>Do we collect sensitive information?</strong> We may collect sensitive information such as financial
          data and API keys when you use certain features of Stay Social CRM. This information is collected with your
          consent and used only as necessary to provide the service. Learn more about{" "}
          <a href="#sensitiveinfo" className="text-blue-600 dark:text-blue-400 hover:underline">
            sensitive information we collect
          </a>
          .
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>Do we collect any information from third parties?</strong> We do not collect any information from
          third parties.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>How do we use your information?</strong> We use your information to operate Stay Social CRM, provide
          customer support, improve our services, and ensure security. We only use your information for legitimate
          business purposes. Learn more about{" "}
          <a href="#infouse" className="text-blue-600 dark:text-blue-400 hover:underline">
            how we use your information
          </a>
          .
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>Do we share your information?</strong> We may share your information with service providers who help
          us operate Stay Social CRM, or in connection with business transfers. We do not sell your personal
          information. Learn more about{" "}
          <a href="#whoshare" className="text-blue-600 dark:text-blue-400 hover:underline">
            when we share information
          </a>
          .
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>How do we protect your information?</strong> We implement security measures to protect your personal
          information, including encryption and secure data storage. However, no method of transmission over the
          internet is 100% secure. Learn more about{" "}
          <a href="#infosafe" className="text-blue-600 dark:text-blue-400 hover:underline">
            our security practices
          </a>
          .
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>What are your privacy rights?</strong> Depending on where you live, you may have rights to access,
          correct, or delete your personal information. Learn more about{" "}
          <a href="#privacyrights" className="text-blue-600 dark:text-blue-400 hover:underline">
            your rights and how to exercise them
          </a>
          .
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by visiting{" "}
          <a
            href="https://www.serelora.com/contact"
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://www.spencerwozniak.com/contact
          </a>
          , or by contacting us. We will consider and act upon any request in accordance with applicable data protection
          laws.
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          For complete details about our privacy practices, please{" "}
          <a href="#toc" className="text-blue-600 dark:text-blue-400 hover:underline">
            review the full Privacy Policy below
          </a>
          .
        </p>

        <h2 id="toc" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          TABLE OF CONTENTS
        </h2>
        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">
            <a href="#infocollect" className="text-blue-600 dark:text-blue-400 hover:underline">
              1. WHAT INFORMATION DO WE COLLECT?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#infouse" className="text-blue-600 dark:text-blue-400 hover:underline">
              2. HOW DO WE PROCESS YOUR INFORMATION?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#whoshare" className="text-blue-600 dark:text-blue-400 hover:underline">
              3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#cookies" className="text-blue-600 dark:text-blue-400 hover:underline">
              4. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#ai" className="text-blue-600 dark:text-blue-400 hover:underline">
              5. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#inforetain" className="text-blue-600 dark:text-blue-400 hover:underline">
              6. HOW LONG DO WE KEEP YOUR INFORMATION?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#infosafe" className="text-blue-600 dark:text-blue-400 hover:underline">
              7. HOW DO WE KEEP YOUR INFORMATION SAFE?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#infominors" className="text-blue-600 dark:text-blue-400 hover:underline">
              8. DO WE COLLECT INFORMATION FROM MINORS?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#privacyrights" className="text-blue-600 dark:text-blue-400 hover:underline">
              9. WHAT ARE YOUR PRIVACY RIGHTS?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#DNT" className="text-blue-600 dark:text-blue-400 hover:underline">
              10. CONTROLS FOR DO-NOT-TRACK FEATURES
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#uslaws" className="text-blue-600 dark:text-blue-400 hover:underline">
              11. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#policyupdates" className="text-blue-600 dark:text-blue-400 hover:underline">
              12. DO WE MAKE UPDATES TO THIS NOTICE?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#contact" className="text-blue-600 dark:text-blue-400 hover:underline">
              13. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
            </a>
          </li>
          <li className="text-base leading-relaxed">
            <a href="#request" className="text-blue-600 dark:text-blue-400 hover:underline">
              14. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?
            </a>
          </li>
        </ul>

        <h2 id="infocollect" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          1. WHAT INFORMATION DO WE COLLECT?
        </h2>
        <h3 id="personalinfo" className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">
          Personal information you disclose to us
        </h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>We collect personal information that you provide to us.</em>
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We collect personal information that you provide when you create an account, use Stay Social CRM, or contact
          us for support. The information we collect depends on how you use the application and which features you
          access.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>Information You Provide.</strong> When you use Stay Social CRM, we may collect the following types of
          personal information:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">names</li>
          <li className="text-base leading-relaxed">phone numbers</li>
          <li className="text-base leading-relaxed">email addresses</li>
          <li className="text-base leading-relaxed">mailing addresses</li>
          <li className="text-base leading-relaxed">job titles</li>
          <li className="text-base leading-relaxed">usernames</li>
          <li className="text-base leading-relaxed">passwords</li>
          <li className="text-base leading-relaxed">api keys</li>
        </ul>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          All personal information that you provide to us must be true, complete, and accurate, and you must notify us
          of any changes to such personal information.
        </p>

        <h3 id="sensitiveinfo" className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">
          Sensitive Information
        </h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          When necessary, with your consent or as otherwise permitted by applicable law, we process the following
          categories of sensitive information:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">financial data</li>
          <li className="text-base leading-relaxed">api keys</li>
        </ul>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">Google API</h3>
        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          Our use of information received from Google APIs will adhere to{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy#limited-use"
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Limited Use requirements
          </a>
          .
        </p>

        <h2 id="infouse" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          2. HOW DO WE PROCESS YOUR INFORMATION?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>
            We use your information to operate Stay Social CRM, provide customer support, improve our services, and
            ensure security. We may also use your information for other purposes with your consent.
          </em>
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>We use your personal information for the following purposes:</strong>
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-3 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">
            <strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong> We
            may process your information so you can create and log in to your account, as well as keep your account in
            working order.
          </li>
          <li className="text-base leading-relaxed">
            <strong>To deliver and facilitate delivery of services to the user.</strong> We may process your information
            to provide you with the requested service.
          </li>
          <li className="text-base leading-relaxed">
            <strong>To respond to user inquiries/offer support to users.</strong> We may process your information to
            respond to your inquiries and solve any potential issues you might have with the requested service.
          </li>
          <li className="text-base leading-relaxed">
            <strong>To send administrative information to you.</strong> We may process your information to send you
            details about our products and services, changes to our terms and policies, and other similar information.
          </li>
          <li className="text-base leading-relaxed">
            <strong>To request feedback.</strong> We may process your information when necessary to request feedback and
            to contact you about your use of our Services.
          </li>
          <li className="text-base leading-relaxed">
            <strong>To protect our Services.</strong> We may process your information as part of our efforts to keep our
            Services safe and secure, including fraud monitoring and prevention.
          </li>
          <li className="text-base leading-relaxed">
            <strong>To evaluate and improve our Services, products, marketing, and your experience.</strong> We may
            process your information when we believe it is necessary to identify usage trends, determine the
            effectiveness of our promotional campaigns, and to evaluate and improve our Services, products, marketing,
            and your experience.
          </li>
          <li className="text-base leading-relaxed">
            <strong>To identify usage trends.</strong> We may process information about how you use our Services to
            better understand how they are being used so we can improve them.
          </li>
          <li className="text-base leading-relaxed">
            <strong>To comply with our legal obligations.</strong> We may process your information to comply with our
            legal obligations, respond to legal requests, and exercise, establish, or defend our legal rights.
          </li>
        </ul>

        <h2 id="whoshare" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>
            We may share your information with service providers who help us operate Stay Social CRM, or in connection
            with business transfers. We do not sell your personal information.
          </em>
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We may share your personal information in the following circumstances:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">
            <strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during
            negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our
            business to another company.
          </li>
          <li className="text-base leading-relaxed">
            <strong>Business Partners.</strong> We may share your information with our business partners to offer you
            certain products, services, or promotions.
          </li>
        </ul>

        <h2 id="cookies" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          4. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>We may use cookies and other tracking technologies to collect and store your information.</em>
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We use cookies and similar tracking technologies to help Stay Social CRM function properly, maintain your
          session, remember your preferences, and improve security. These technologies help us understand how you use
          the application so we can enhance your experience.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We may also use third-party analytics services to help us understand how Stay Social CRM is used and to
          improve our services. These services may use cookies and similar technologies to collect information about
          your use of the application.
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          To the extent these online tracking technologies are deemed to be a &quot;sale&quot;/&quot;sharing&quot;
          (which includes targeted advertising, as defined under the applicable laws) under applicable US state laws,
          you can opt out of these online tracking technologies by submitting a request as described below under section{" "}
          <a href="#uslaws" className="text-blue-600 dark:text-blue-400 hover:underline">
            DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
          </a>
          .
        </p>

        <h2 id="ai" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          5. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>
            We offer products, features, or tools powered by artificial intelligence, machine learning, or similar
            technologies.
          </em>
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Stay Social CRM includes features powered by artificial intelligence and machine learning technologies. These
          features are designed to help you manage your client relationships more effectively. This Privacy Policy
          applies to your use of these AI-powered features.
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">Use of AI Technologies</h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We use third-party AI service providers, including OpenAI, to power certain features in Stay Social CRM. When
          you use these features, your data may be shared with these providers to process your requests. This sharing is
          described in more detail in the section on{" "}
          <a href="#whoshare" className="text-blue-600 dark:text-blue-400 hover:underline">
            when we share information
          </a>
          . You must use these features in accordance with the terms and policies of our AI service providers.
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">
          AI Features in Stay Social CRM
        </h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          The AI-powered features in Stay Social CRM include:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">Text analysis and processing</li>
        </ul>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">
          How We Handle Your Data with AI
        </h3>
        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          When you use AI-powered features in Stay Social CRM, we handle your data in accordance with this Privacy
          Policy and our agreements with AI service providers. We implement security measures to protect your
          information throughout the process.
        </p>

        <h2 id="inforetain" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          6. HOW LONG DO WE KEEP YOUR INFORMATION?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>
            We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice
            unless otherwise required by law.
          </em>
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We retain your personal information for as long as necessary to provide Stay Social CRM to you, unless a
          longer retention period is required by law (such as for tax, accounting, or other legal requirements). We will
          delete your personal information within three (3) months after you terminate your account, unless we are
          required to retain it for legal purposes.
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          When we have no ongoing legitimate business need to process your personal information, we will either delete
          or anonymize such information, or, if this is not possible (for example, because your personal information has
          been stored in backup archives), then we will securely store your personal information and isolate it from any
          further processing until deletion is possible.
        </p>

        <h2 id="infosafe" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          7. HOW DO WE KEEP YOUR INFORMATION SAFE?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>
            We aim to protect your personal information through a system of organizational and technical security
            measures.
          </em>
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          We implement security measures to protect your personal information, including encryption, secure data
          storage, and access controls. However, no method of transmission over the internet or electronic storage is
          100% secure. While we strive to protect your information, we cannot guarantee absolute security. You should
          access Stay Social CRM from a secure network and keep your login credentials confidential.
        </p>

        <h2 id="infominors" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          8. DO WE COLLECT INFORMATION FROM MINORS?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>We do not knowingly collect data from or market to children under 18 years of age.</em>
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          Stay Social CRM is not intended for users under 18 years of age. We do not knowingly collect personal
          information from children under 18. If you are under 18, please do not use Stay Social CRM. If we become aware
          that we have collected information from a user under 18, we will delete that information and deactivate the
          account. If you believe we have collected information from someone under 18, please contact us at{" "}
          <a href="mailto:legal@serelora.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            legal@serelora.com
          </a>
          .
        </p>

        <h2 id="privacyrights" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          9. WHAT ARE YOUR PRIVACY RIGHTS?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>
            You have rights regarding your personal information, including the right to access, correct, or delete your
            data, depending on where you live.
          </em>
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">Withdrawing your consent</h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          If we are relying on your consent to process your personal information, which may be express and/or implied
          consent depending on the applicable law, you have the right to withdraw your consent at any time. You can
          withdraw your consent at any time by contacting us by using the contact details provided in the section{" "}
          <a href="#contact" className="text-blue-600 dark:text-blue-400 hover:underline">
            HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
          </a>{" "}
          below.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          However, please note that this will not affect the lawfulness of the processing before its withdrawal nor,
          when applicable law allows, will it affect the processing of your personal information conducted in reliance
          on lawful processing grounds other than consent.
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">Account Information</h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          If you would at any time like to review or change the information in your account or terminate your account,
          you can:
        </p>

        <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">Log in to your account settings and update your user account.</li>
          <li className="text-base leading-relaxed">Contact us using the contact information provided.</li>
        </ul>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Upon your request to terminate your account, we will deactivate or delete your account and information from
          our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot
          problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal
          requirements.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <u>Cookies and similar technologies:</u>
          </strong>{" "}
          Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your
          browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could
          affect certain features or services of our Services.
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          If you have questions or comments about your privacy rights, you may email us at{" "}
          <a href="mailto:legal@serelora.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            legal@serelora.com
          </a>
          .
        </p>

        <h2 id="DNT" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          10. CONTROLS FOR DO-NOT-TRACK FEATURES
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track
          (&quot;DNT&quot;) feature or setting you can activate to signal your privacy preference not to have data about
          your online browsing activities monitored and collected. At this stage, no uniform technology standard for
          recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT
          browser signals or any other mechanism that automatically communicates your choice not to be tracked online.
          If a standard for online tracking is adopted that we must follow in the future, we will inform you about that
          practice in a revised version of this Privacy Notice.
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          California law requires us to let you know how we respond to web browser DNT signals. Because there currently
          is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at
          this time.
        </p>

        <h2 id="uslaws" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          11. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>
            If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky,
            Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas,
            Utah, or Virginia, you may have the right to request access to and receive details about the personal
            information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or
            delete your personal information. You may also have the right to withdraw your consent to our processing of
            your personal information. These rights may be limited in some circumstances by applicable law. More
            information is provided below.
          </em>
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">
          Categories of Personal Information We Collect
        </h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          The table below shows the categories of personal information we have collected in the past twelve (12) months.
          The table includes illustrative examples of each category and does not reflect the personal information we
          collect from you. For a comprehensive inventory of all personal information we process, please refer to the
          section{" "}
          <a href="#infocollect" className="text-blue-600 dark:text-blue-400 hover:underline">
            WHAT INFORMATION DO WE COLLECT?
          </a>
          .
        </p>

        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border border-gray-300 dark:border-neutral-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-neutral-800">
                <th className="border border-gray-300 dark:border-neutral-700 px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Category
                </th>
                <th className="border border-gray-300 dark:border-neutral-700 px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Examples
                </th>
                <th className="border border-gray-300 dark:border-neutral-700 px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Collected
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-900 dark:text-neutral-200">
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">A. Identifiers</td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique
                  personal identifier, online identifier, Internet Protocol address, email address, and account name
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">YES</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  B. Personal information as defined in the California Customer Records statute
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Name, contact information, education, employment, employment history, and financial information
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">YES</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  C. Protected classification characteristics under state or federal law
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic
                  data
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">D. Commercial information</td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Transaction information, purchase history, financial details, and payment information
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">E. Biometric information</td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Fingerprints and voiceprints
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  F. Internet or other similar network activity
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Browsing history, search history, online behavior, interest data, and interactions with our and other
                  websites, applications, systems, and advertisements
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">G. Geolocation data</td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">Device location</td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  H. Audio, electronic, sensory, or similar information
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Images and audio, video or call recordings created in connection with our business activities
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  I. Professional or employment-related information
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Business contact details in order to provide you our Services at a business level or job title, work
                  history, and professional qualifications if you apply for a job with us
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">J. Education Information</td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Student records and directory information
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  K. Inferences drawn from collected personal information
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Inferences drawn from any of the collected personal information listed above to create a profile or
                  summary about, for example, an individual&apos;s preferences and characteristics
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">NO</td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  L. Sensitive personal Information
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">
                  Financial information including account access details and account login information
                </td>
                <td className="border border-gray-300 dark:border-neutral-700 px-4 py-2">YES</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We only collect sensitive personal information, as defined by applicable privacy laws or the purposes allowed
          by law or with your consent. Sensitive personal information may be used, or disclosed to a service provider or
          contractor, for additional, specified purposes. You may have the right to limit the use or disclosure of your
          sensitive personal information. We do not collect or process sensitive personal information for the purpose of
          inferring characteristics about you.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We may also collect other personal information outside of these categories through instances where you
          interact with us in person, online, or by phone or mail in the context of:
        </p>

        <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">Receiving help through our customer support channels;</li>
          <li className="text-base leading-relaxed">Participation in customer surveys or contests; and</li>
          <li className="text-base leading-relaxed">
            Facilitation in the delivery of our Services and to respond to your inquiries.
          </li>
        </ul>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We will use and retain the collected personal information as needed to provide the Services or for:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">Category A - As long as the user has an account with us</li>
          <li className="text-base leading-relaxed">Category B - As long as the user has an account with us</li>
          <li className="text-base leading-relaxed">Category L - As long as the user has an account with us</li>
        </ul>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">
          Sources of Personal Information
        </h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Learn more about the sources of personal information we collect in{" "}
          <a href="#infocollect" className="text-blue-600 dark:text-blue-400 hover:underline">
            WHAT INFORMATION DO WE COLLECT?
          </a>
          .
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">
          How We Use and Share Personal Information
        </h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Learn more about how we use your personal information in the section,{" "}
          <a href="#infouse" className="text-blue-600 dark:text-blue-400 hover:underline">
            HOW DO WE PROCESS YOUR INFORMATION?
          </a>
          .
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>Will your information be shared with anyone else?</strong>
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We may disclose your personal information with our service providers pursuant to a written contract between us
          and each service provider. Learn more about how we disclose personal information to in the section,{" "}
          <a href="#whoshare" className="text-blue-600 dark:text-blue-400 hover:underline">
            WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
          </a>
          .
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          We may use your personal information for our own business purposes, such as for undertaking internal research
          for technological development and demonstration. This is not considered to be &quot;selling&quot; of your
          personal information.
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          We have not disclosed, sold, or shared any personal information to third parties for a business or commercial
          purpose in the preceding twelve (12) months. We will not sell or share personal information in the future
          belonging to website visitors, users, and other consumers.
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">Your Rights</h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          You have rights under certain US state data protection laws. However, these rights are not absolute, and in
          certain cases, we may decline your request as permitted by law. These rights include:
        </p>

        <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">
            <strong>Right to know</strong> whether or not we are processing your personal data
          </li>
          <li className="text-base leading-relaxed">
            <strong>Right to access</strong> your personal data
          </li>
          <li className="text-base leading-relaxed">
            <strong>Right to correct</strong> inaccuracies in your personal data
          </li>
          <li className="text-base leading-relaxed">
            <strong>Right to request</strong> the deletion of your personal data
          </li>
          <li className="text-base leading-relaxed">
            <strong>Right to obtain a copy</strong> of the personal data you previously shared with us
          </li>
          <li className="text-base leading-relaxed">
            <strong>Right to non-discrimination</strong> for exercising your rights
          </li>
          <li className="text-base leading-relaxed">
            <strong>Right to opt out</strong> of the processing of your personal data if it is used for targeted
            advertising (or sharing as defined under California&apos;s privacy law), the sale of personal data, or
            profiling in furtherance of decisions that produce legal or similarly significant effects
            (&quot;profiling&quot;)
          </li>
        </ul>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Depending upon the state where you live, you may also have the following rights:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">
            Right to access the categories of personal data being processed (as permitted by applicable law, including
            the privacy law in Minnesota)
          </li>
          <li className="text-base leading-relaxed">
            Right to obtain a list of the categories of third parties to which we have disclosed personal data (as
            permitted by applicable law, including the privacy law in California, Delaware, and Maryland)
          </li>
          <li className="text-base leading-relaxed">
            Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted by
            applicable law, including the privacy law in Minnesota and Oregon)
          </li>
          <li className="text-base leading-relaxed">
            Right to obtain a list of third parties to which we have sold personal data (as permitted by applicable law,
            including the privacy law in Connecticut)
          </li>
          <li className="text-base leading-relaxed">
            Right to review, understand, question, and depending on where you live, correct how personal data has been
            profiled (as permitted by applicable law, including the privacy law in Connecticut and Minnesota)
          </li>
          <li className="text-base leading-relaxed">
            Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including the
            privacy law in California)
          </li>
          <li className="text-base leading-relaxed">
            Right to opt out of the collection of sensitive data and personal data collected through the operation of a
            voice or facial recognition feature (as permitted by applicable law, including the privacy law in Florida)
          </li>
        </ul>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">How to Exercise Your Rights</h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          To exercise these rights, you can contact us by visiting{" "}
          <a
            href="https://www.serelora.com/contact"
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://www.spencerwozniak.com/contact
          </a>
          , by emailing us at{" "}
          <a href="mailto:legal@serelora.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            legal@serelora.com
          </a>
          , or by referring to the contact details at the bottom of this document.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Under certain US state data protection laws, you can designate an authorized agent to make a request on your
          behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly
          authorized to act on your behalf in accordance with applicable laws.
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">Request Verification</h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Upon receiving your request, we will need to verify your identity to determine you are the same person about
          whom we have the information in our system. We will only use personal information provided in your request to
          verify your identity or authority to make the request. However, if we cannot verify your identity from the
          information already maintained by us, we may request that you provide additional information for the purposes
          of verifying your identity and for security or fraud-prevention purposes.
        </p>

        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          If you submit the request through an authorized agent, we may need to collect additional information to verify
          your identity before processing your request and the agent will need to provide a written and signed
          permission from you to submit such request on your behalf.
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">Appeals</h3>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          Under certain US state data protection laws, if we decline to take action regarding your request, you may
          appeal our decision by emailing us at{" "}
          <a href="mailto:legal@serelora.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            legal@serelora.com
          </a>
          . We will inform you in writing of any action taken or not taken in response to the appeal, including a
          written explanation of the reasons for the decisions. If your appeal is denied, you may submit a complaint to
          your state attorney general.
        </p>

        <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-900 dark:text-white">
          California &quot;Shine The Light&quot; Law
        </h3>
        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          California Civil Code Section 1798.83, also known as the &quot;Shine The Light&quot; law, permits our users
          who are California residents to request and obtain from us, once a year and free of charge, information about
          categories of personal information (if any) we disclosed to third parties for direct marketing purposes and
          the names and addresses of all third parties with which we shared personal information in the immediately
          preceding calendar year. If you are a California resident and would like to make such a request, please submit
          your request in writing to us by using the contact details provided in the section{" "}
          <a href="#contact" className="text-blue-600 dark:text-blue-400 hover:underline">
            HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
          </a>
          .
        </p>

        <h2 id="policyupdates" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          12. DO WE MAKE UPDATES TO THIS NOTICE?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          <strong>
            <em>In Short:</em>
          </strong>{" "}
          <em>Yes, we will update this notice as necessary to stay compliant with relevant laws.</em>
        </p>

        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          We may update this Privacy Policy from time to time. When we make changes, we will update the &quot;Last
          updated&quot; date at the top of this page. If we make material changes, we will notify you by email or by
          posting a notice in Stay Social CRM. We encourage you to review this Privacy Policy periodically to stay
          informed about how we protect your information.
        </p>

        <h2 id="contact" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          13. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
        </h2>
        <p className="text-base mb-4 leading-relaxed text-gray-900 dark:text-neutral-200">
          If you have questions about this Privacy Policy, you can contact us:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-900 dark:text-neutral-200">
          <li className="text-base leading-relaxed">
            By email:{" "}
            <a href="mailto:legal@serelora.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              legal@serelora.com
            </a>
          </li>
          <li className="text-base leading-relaxed">
            By mail: Serelora, 1501 India St, Suite 103, San Diego, CA 92101, United States
          </li>
        </ul>

        <h2 id="request" className="text-3xl font-bold mt-10 mb-4 text-gray-900 dark:text-white">
          14. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?
        </h2>
        <p className="text-base mb-6 leading-relaxed text-gray-900 dark:text-neutral-200">
          You have the right to request access to, correction of, or deletion of your personal information. You can also
          request a copy of the data we have about you. To exercise these rights, please contact us at{" "}
          <a href="mailto:legal@serelora.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            legal@serelora.com
          </a>{" "}
          or visit{" "}
          <a
            href="https://www.serelora.com/contact"
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://www.spencerwozniak.com/contact
          </a>
          . These rights may be limited in some circumstances by applicable law.
        </p>
      </article>
    </div>
  );
}
