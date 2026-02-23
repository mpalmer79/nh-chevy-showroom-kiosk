/**
 * VINScanner Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VINScanner from '../components/VINScanner';

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
const mockEnumerateDevices = jest.fn();

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
  writable: true,
});

// Mock BarcodeDetector
const mockDetect = jest.fn();
(window as any).BarcodeDetector = jest.fn().mockImplementation(() => ({
  detect: mockDetect,
}));

describe('VINScanner', () => {
  const mockOnClose = jest.fn();
  const mockOnScan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'camera1' },
    ]);
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
      getVideoTracks: () => [{ applyConstraints: jest.fn() }],
    });
    mockDetect.mockResolvedValue([]);
  });

  it('renders when isOpen is true', () => {
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    expect(screen.getByText('Scan VIN Barcode')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <VINScanner isOpen={false} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    const closeButton = screen.getByRole('button', { name: '' }); // SVG close button
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('validates VIN format - accepts valid VIN', () => {
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    const input = screen.getByPlaceholderText('Enter 17-character VIN');
    fireEvent.change(input, { target: { value: '1HGBH41JXMN109186' } });
    
    const submitButton = screen.getByText('Use VIN');
    fireEvent.click(submitButton);
    
    expect(mockOnScan).toHaveBeenCalledWith('1HGBH41JXMN109186');
  });

  it('validates VIN format - rejects invalid VIN', () => {
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    const input = screen.getByPlaceholderText('Enter 17-character VIN');
    fireEvent.change(input, { target: { value: 'INVALID' } });
    
    const submitButton = screen.getByText('Use VIN');
    expect(submitButton).toBeDisabled();
  });

  it('converts input to uppercase', () => {
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    const input = screen.getByPlaceholderText('Enter 17-character VIN') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc123' } });
    
    expect(input.value).toBe('ABC123');
  });

  it('shows tip about vehicle registration', () => {
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    expect(screen.getByText(/vehicle registration/i)).toBeInTheDocument();
  });

  it('requests camera permissions on open', async () => {
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });
    });
  });

  it('shows error when camera access is denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce({ name: 'NotAllowedError' });
    
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Camera access denied/i)).toBeInTheDocument();
    });
  });

  it('shows error when no camera found', async () => {
    mockGetUserMedia.mockRejectedValueOnce({ name: 'NotFoundError' });
    
    render(
      <VINScanner isOpen={true} onClose={mockOnClose} onScan={mockOnScan} />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/No camera found/i)).toBeInTheDocument();
    });
  });
});
