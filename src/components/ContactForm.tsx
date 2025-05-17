'use client';

import React, { useState, useEffect } from 'react';

import styles from './ContactForm.module.css';
import TempMsg from '@/components/TempMsg';
import NavButton from '@/components/NavButton';

const ContactForm: React.FC = () => {

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    questions_or_comments: ''
  });

  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const isValid = !!formData.name && !!formData.email && !!formData.phone && !!formData.location;
    setIsFormValid(isValid);
  }, [formData]);

  const formatPhoneNumber = (value: string) => {
    const phone = value.replace(/[^\d]/g, '');
    if (phone.length < 4) return phone;
    if (phone.length < 7) return `(${phone.slice(0, 3)}) ${phone.slice(3)}`;
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6, 10)}`;
  };

  const stripPhoneNumberFormatting = (phone: string) => phone.replace(/[^\d]/g, '');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData({ ...formData, phone: formatPhoneNumber(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    if (value !== '') e.target.classList.add(styles.hasContent);
    else e.target.classList.remove(styles.hasContent);
  };

  const handlePhoneNumberKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (!/[0-9]/.test(e.key) && !allowed.includes(e.key)) e.preventDefault();
  };

  const clearForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      questions_or_comments: ''
    });
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    const payload = {
      ...formData,
      phone: stripPhoneNumberFormatting(formData.phone)
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Submission failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader!.read();
        done = readerDone;
        if (value) {
          setResponseMessage((prev) => prev + decoder.decode(value, { stream: true }));
        }
      }

      clearForm();
    } catch (err) {
      console.log(err)
      setResponseMessage('An error occurred while submitting the form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
      <h1>Book a Free Consultation</h1>
      <p style={{ marginBottom: '1rem' }}>Let’s talk about your MCAT goals, timeline, and how we can help you reach the score you need.</p>
        <br />
        <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.group}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Name"
              />
            </div>
          </div>

          <div className={styles.group}>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Email"
            />
          </div>
          <div className={styles.group}>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              onKeyDown={handlePhoneNumberKeyPress}
              required
              placeholder="Phone Number"
            />
          </div>
          <div className={styles.group}>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
              placeholder="City / ZIP Code"
            />
          </div>
          <div className={styles.group}>
            <textarea
              name="questions_or_comments"
              value={formData.questions_or_comments}
              onChange={handleInputChange}
              placeholder="Questions or comments"
            />
          </div>

          <div className={styles.group}>
            <NavButton
              className={styles.submitButton}
              onClick={handleSubmit}
              label={isSubmitting ? 'SUBMITTING...' : 'REQUEST A FREE CONSULTATION'}
              disabled={!isFormValid || isSubmitting}
            />
          </div>
        </form>

        {responseMessage && (
          <TempMsg
            message={responseMessage}
            clearMessage={() => setResponseMessage('')}
            duration={5000}
            error={false}
          />
        )}
      </div>
    </div>
  );
};

export default ContactForm;
