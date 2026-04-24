import React, { useState, useEffect, CSSProperties } from 'react';

// Sample reviews - replace with Featurable API or manual updates
const REVIEWS = [
  {
    id: 1,
    author: "Michael T.",
    rating: 5,
    text: "Absolutely the best car buying experience I've ever had! The team at New Hampshire Chevrolet went above and beyond to find me the perfect Silverado. No pressure, no games, just great service.",
    date: "2 weeks ago"
  },
  {
    id: 2,
    author: "Sarah M.",
    rating: 5,
    text: "Just picked up my new Equinox and couldn't be happier. The sales team was knowledgeable and patient with all my questions. Financing was quick and easy too!",
    date: "1 week ago"
  },
  {
    id: 3,
    author: "David R.",
    rating: 5,
    text: "Third vehicle I've bought from New Hampshire Chevrolet. They always treat me like family. Fair prices, great selection, and the service department is top notch.",
    date: "3 days ago"
  },
  {
    id: 4,
    author: "Jennifer L.",
    rating: 4,
    text: "Very smooth transaction from start to finish. They had exactly what I was looking for and the price was competitive. Would definitely recommend to friends and family.",
    date: "1 month ago"
  },
  {
    id: 5,
    author: "Robert K.",
    rating: 5,
    text: "The staff here is incredible. They helped me find a Tahoe that fit my budget and my family's needs perfectly. Five stars all around!",
    date: "2 weeks ago"
  },
  {
    id: 6,
    author: "Amanda W.",
    rating: 5,
    text: "I was nervous about buying my first new car, but the team at New Hampshire Chevrolet made it so easy. They explained everything clearly and never made me feel rushed.",
    date: "5 days ago"
  },
  {
    id: 7,
    author: "Chris P.",
    rating: 4,
    text: "Great dealership with a huge selection. Found my Traverse here after searching for weeks. The trade-in process was fair and straightforward.",
    date: "3 weeks ago"
  },
  {
    id: 8,
    author: "Lisa H.",
    rating: 5,
    text: "New Hampshire Chevrolet has earned a customer for life! From sales to service, everyone is professional and friendly. Best dealership in New Hampshire!",
    date: "1 week ago"
  },
  {
    id: 9,
    author: "James B.",
    rating: 5,
    text: "Drove over an hour to buy from New Hampshire Chevrolet and it was worth every mile. Their prices beat everyone else and the customer service was outstanding.",
    date: "4 days ago"
  },
  {
    id: 10,
    author: "Michelle D.",
    rating: 5,
    text: "The New Hampshire Chevrolet team went above and beyond to get me approved for financing. I thought I'd never get a new car but they made it happen!",
    date: "1 week ago"
  },
  {
    id: 11,
    author: "Steven G.",
    rating: 4,
    text: "Solid dealership experience. No surprises, no hidden fees. They gave me a fair price for my trade and the Blazer I bought is amazing.",
    date: "2 weeks ago"
  },
  {
    id: 12,
    author: "Karen S.",
    rating: 5,
    text: "I've purchased three vehicles from New Hampshire Chevrolet over the years and they never disappoint. Honest, reliable, and always willing to work with you on price.",
    date: "6 days ago"
  },
  {
    id: 13,
    author: "Brian M.",
    rating: 5,
    text: "Best truck buying experience ever! The sales team really knows their stuff. They helped me pick the right Silverado for my towing needs.",
    date: "1 month ago"
  },
  {
    id: 14,
    author: "Nicole F.",
    rating: 5,
    text: "Love my new Trailblazer! The whole process took less than two hours from test drive to driving off the lot. Super efficient team.",
    date: "3 days ago"
  },
  {
    id: 15,
    author: "Thomas J.",
    rating: 4,
    text: "Good selection of vehicles and the staff is very helpful. They stayed late to finish my paperwork so I could take my truck home that night.",
    date: "2 weeks ago"
  },
  {
    id: 16,
    author: "Rachel C.",
    rating: 5,
    text: "Finally found a dealership I can trust! New Hampshire Chevrolet gave me a great deal on my Equinox and the service department has been fantastic for maintenance.",
    date: "1 week ago"
  },
  {
    id: 17,
    author: "Mark A.",
    rating: 5,
    text: "These guys are the real deal. No gimmicks, no pressure tactics. Just honest people selling great trucks. Already recommended them to my brother.",
    date: "5 days ago"
  },
  {
    id: 18,
    author: "Stephanie R.",
    rating: 5,
    text: "The internet team responded within minutes and had everything ready when I arrived. Easiest car purchase I've ever made. Thank you NH Chevy!",
    date: "4 days ago"
  },
  {
    id: 19,
    author: "Daniel W.",
    rating: 4,
    text: "Very professional dealership. They respected my time and my budget. Got a great deal on a Colorado and the truck has been perfect.",
    date: "3 weeks ago"
  },
  {
    id: 20,
    author: "Emily N.",
    rating: 5,
    text: "Can't say enough good things about New Hampshire Chevrolet! From the moment I walked in, I felt welcomed. My new Tahoe is everything I wanted and more.",
    date: "2 days ago"
  },
];

interface GoogleReviewsProps {
  rotationInterval?: number; // milliseconds
}

const GoogleReviews: React.FC<GoogleReviewsProps> = ({ 
  rotationInterval = 10000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Rotate reviews
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % REVIEWS.length);
        setIsVisible(true);
      }, 500); // Half second for fade out before changing
      
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [rotationInterval]);

  const currentReview = REVIEWS[currentIndex];

  // Truncate review text to first ~200 characters at word boundary
  const truncateText = (text: string, maxLength: number = 200): string => {
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    return truncated.substring(0, truncated.lastIndexOf(' ')) + '...';
  };

  // Render stars
  const renderStars = (rating: number) => {
    return (
      <div style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span 
            key={star} 
            style={{
              ...styles.star,
              color: star <= rating ? '#FBBC04' : '#E0E0E0'
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container} className="google-reviews-card">
      {/* Header with overall rating */}
      <div style={styles.header}>
        <div style={styles.googleLogo}>
          <svg width="28" height="28" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span style={styles.googleText}>Google Reviews</span>
        </div>
        
        <div style={styles.overallRating}>
          <span style={styles.ratingNumber}>4.3</span>
          <div style={styles.ratingDetails}>
            {renderStars(4)}
            <span style={styles.reviewCount}>1,430 reviews</span>
          </div>
        </div>
      </div>

      {/* Current Review */}
      <div 
        style={{
          ...styles.reviewCard,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        }}
      >
        <div style={styles.reviewHeader}>
          <div style={styles.avatar}>
            {currentReview.author.charAt(0)}
          </div>
          <div style={styles.reviewerInfo}>
            <span style={styles.authorName}>{currentReview.author}</span>
            <span style={styles.reviewDate}>{currentReview.date}</span>
          </div>
          {renderStars(currentReview.rating)}
        </div>
        
        <p style={styles.reviewText}>
          "{truncateText(currentReview.text)}"
        </p>
      </div>

      {/* Progress indicator */}
      <div style={styles.progressContainer}>
        <div style={styles.progressText}>
          {currentIndex + 1} of {REVIEWS.length}
        </div>
        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${((currentIndex + 1) / REVIEWS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <style>{`
        /* Mobile Portrait */
        @media (max-width: 768px) and (orientation: portrait) {
          .google-reviews-card {
            padding: 24px 20px !important;
            min-height: 280px !important;
            border-radius: 20px !important;
          }
        }
        
        /* Mobile Landscape */
        @media (max-width: 900px) and (orientation: landscape) {
          .google-reviews-card {
            padding: 20px 24px !important;
            min-height: 320px !important;
          }
        }
        
        /* Tablet */
        @media (min-width: 769px) and (max-width: 1024px) {
          .google-reviews-card {
            padding: 28px 32px !important;
            min-height: 360px !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    background: '#ffffff',
    borderRadius: '24px',
    padding: '32px 36px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    border: '1px solid #e0e0e0',
    maxWidth: '520px',
    width: '100%',
    minHeight: '380px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f0f0f0',
  },
  googleLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  googleText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#5f6368',
  },
  overallRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  ratingNumber: {
    fontSize: '42px',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  ratingDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stars: {
    display: 'flex',
    gap: '3px',
  },
  star: {
    fontSize: '22px',
  },
  reviewCount: {
    fontSize: '14px',
    color: '#5f6368',
  },
  reviewCard: {
    transition: 'all 0.5s ease',
    minHeight: '160px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '16px',
  },
  avatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0077b6 0%, #005a8c 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '600',
  },
  reviewerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  authorName: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewDate: {
    fontSize: '14px',
    color: '#5f6368',
  },
  reviewText: {
    fontSize: '17px',
    lineHeight: '1.7',
    color: '#333',
    margin: 0,
    fontStyle: 'italic',
    flex: 1,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginTop: '24px',
  },
  progressText: {
    fontSize: '14px',
    color: '#5f6368',
    minWidth: '65px',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    background: '#E0E0E0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #0077b6 0%, #00a8e8 100%)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
};

export default GoogleReviews;
