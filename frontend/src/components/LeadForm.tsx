import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitLead, scheduleTestDrive } from './api';
import type { Vehicle } from '../types';

// ============================================
// TYPE DEFINITIONS
// ============================================

type FormType = 'general' | 'test-drive' | 'info';

interface LeadFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_date: string;
  preferred_time: string;
  questions: string;
}

interface LeadPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  vehicle_id?: string | number;
  context_vin?: string;
  preferred_date?: string;
  preferred_time?: string;
  questions?: string;
}

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle;
  formType?: FormType;
}

// ============================================
// COMPONENT
// ============================================

const LeadForm: React.FC<LeadFormProps> = ({ isOpen, onClose, vehicle, formType = 'general' }) => {
  const [formData, setFormData] = useState<LeadFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    preferred_date: '',
    preferred_time: '',
    questions: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: LeadPayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        vehicle_id: vehicle?.id,
        context_vin: vehicle?.vin,
      };

      if (formType === 'test-drive') {
        payload.preferred_date = formData.preferred_date;
        payload.preferred_time = formData.preferred_time;
        await scheduleTestDrive(payload as Parameters<typeof scheduleTestDrive>[0]);
      } else if (formType === 'info') {
        payload.questions = formData.questions;
        await submitLead(payload as Parameters<typeof submitLead>[0]);
      } else {
        await submitLead(payload as Parameters<typeof submitLead>[0]);
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          preferred_date: '',
          preferred_time: '',
          questions: '',
        });
      }, 3000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Lead submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = (): string => {
    switch (formType) {
      case 'test-drive':
        return 'Schedule a Test Drive';
      case 'info':
        return 'Request More Information';
      default:
        return 'Get in Touch';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        style={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          style={styles.modal}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {isSuccess ? (
            <motion.div
              style={styles.successContainer}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div style={styles.successIcon}>✓</div>
              <h2 style={styles.successTitle}>Thank You!</h2>
              <p style={styles.successMessage}>
                A sales representative will contact you shortly.
              </p>
            </motion.div>
          ) : (
            <>
              <div style={styles.header}>
                <h2 style={styles.title}>{getTitle()}</h2>
                <button style={styles.closeButton} onClick={onClose}>
                  ✕
                </button>
              </div>

              {vehicle && (
                <div style={styles.vehicleInfo}>
                  <span style={styles.vehicleYear}>{vehicle.year}</span>
                  <span style={styles.vehicleName}>
                    {vehicle.make} {vehicle.model}
                  </span>
                  <span style={styles.vehiclePrice}>
                    ${vehicle.price?.toLocaleString()}
                  </span>
                </div>
              )}

              <form style={styles.form} onSubmit={handleSubmit}>
                <div style={styles.row}>
                  <div style={styles.field}>
                    <label style={styles.label}>First Name *</label>
                    <input
                      style={styles.input}
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      placeholder="John"
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Last Name *</label>
                    <input
                      style={styles.input}
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Email *</label>
                  <input
                    style={styles.input}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john.smith@email.com"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Phone</label>
                  <input
                    style={styles.input}
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                  />
                </div>

                {formType === 'test-drive' && (
                  <div style={styles.row}>
                    <div style={styles.field}>
                      <label style={styles.label}>Preferred Date</label>
                      <input
                        style={styles.input}
                        type="date"
                        name="preferred_date"
                        value={formData.preferred_date}
                        onChange={handleChange}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Preferred Time</label>
                      <select
                        style={styles.input}
                        name="preferred_time"
                        value={formData.preferred_time}
                        onChange={handleChange}
                      >
                        <option value="">Select a time</option>
                        <option value="morning">Morning (9am - 12pm)</option>
                        <option value="afternoon">Afternoon (12pm - 5pm)</option>
                        <option value="evening">Evening (5pm - 8pm)</option>
                      </select>
                    </div>
                  </div>
                )}

                {formType === 'info' && (
                  <div style={styles.field}>
                    <label style={styles.label}>Questions or Comments</label>
                    <textarea
                      style={{ ...styles.input, ...styles.textarea }}
                      name="questions"
                      value={formData.questions}
                      onChange={handleChange}
                      placeholder="What would you like to know?"
                      rows={3}
                    />
                  </div>
                )}

                {error && <p style={styles.error}>{error}</p>}

                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>

                <p style={styles.disclaimer}>
                  By submitting, you agree to be contacted by Quirk Auto Dealers.
                </p>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: '#1a1a1a',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid #2a2a2a',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  closeButton: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#242424',
    border: 'none',
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: '1.25rem',
    cursor: 'pointer',
  },
  vehicleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    background: '#141414',
    borderBottom: '1px solid #2a2a2a',
  },
  vehicleYear: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#c9a227',
  },
  vehicleName: {
    flex: 1,
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  vehiclePrice: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  form: {
    padding: '24px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#a0a0a0',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: '#242424',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '100px',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.875rem',
    marginBottom: '16px',
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    background: '#1a472a',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1.125rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '16px',
  },
  disclaimer: {
    fontSize: '0.75rem',
    color: '#666666',
    textAlign: 'center',
  },
  successContainer: {
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  successIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#22c55e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    color: '#ffffff',
    marginBottom: '24px',
  },
  successTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '12px',
  },
  successMessage: {
    fontSize: '1rem',
    color: '#a0a0a0',
  },
};

export default LeadForm;
