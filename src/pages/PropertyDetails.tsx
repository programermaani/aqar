import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Bed,
  Bath,
  Home,
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Star,
  CheckCircle,
  ArrowLeft,
  Camera,
  Play,
  Maximize2,
  X
} from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Property } from '../types/property';
import { toast } from 'react-toastify';

const PropertyDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contactType, setContactType] = useState<'inquiry' | 'visit' | 'offer'>('inquiry');
  const [offerAmount, setOfferAmount] = useState('');

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;

      try {
        const propertyDoc = await getDoc(doc(db, 'properties', id));
        if (propertyDoc.exists()) {
          const propertyData = {
            id: propertyDoc.id,
            ...propertyDoc.data()
          } as Property;
          setProperty(propertyData);

          // Update view count
          await updateDoc(doc(db, 'properties', id), {
            views: (propertyData.views || 0) + 1
          });

          // Check if property is favorited by current user
          if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setIsFavorite((userData.favorites || []).includes(id));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching property:', error);
        toast.error('فشل في تحميل تفاصيل العقار');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, user]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.info('يرجى تسجيل الدخول لحفظ العقارات في المفضلة');
      return;
    }

    if (!property) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const propertyRef = doc(db, 'properties', property.id);

      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(property.id)
        });
        await updateDoc(propertyRef, {
          favorites: property.favorites - 1
        });
        setIsFavorite(false);
        toast.success('تم إزالة العقار من المفضلة');
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(property.id)
        });
        await updateDoc(propertyRef, {
          favorites: property.favorites + 1
        });
        setIsFavorite(true);
        toast.success('تم إضافة العقار إلى المفضلة');
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      toast.error('فشل في تحديث المفضلة');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: property?.title,
      text: property?.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('تم نسخ رابط العقار');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !property) {
      toast.info('يرجى تسجيل الدخول لإرسال رسالة');
      return;
    }

    if (!message.trim()) {
      toast.error('يرجى كتابة رسالة');
      return;
    }

    if (contactType === 'offer' && (!offerAmount || Number(offerAmount) <= 0)) {
      toast.error('يرجى إدخال مبلغ العرض');
      return;
    }

    setSendingMessage(true);
    try {
      // Create inquiry
      await addDoc(collection(db, 'inquiries'), {
        propertyId: property.id,
        propertyTitle: property.title,
        propertyImage: property.images[0],
        buyerId: user.uid,
        buyerName: user.displayName,
        buyerEmail: user.email,
        sellerId: property.sellerId,
        sellerName: property.sellerName,
        type: contactType,
        message,
        offerAmount: contactType === 'offer' ? Number(offerAmount) : null,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Update property inquiries count
      await updateDoc(doc(db, 'properties', property.id), {
        inquiries: property.inquiries + 1
      });

      const successMessages = {
        inquiry: 'تم إرسال استفسارك بنجاح',
        visit: 'تم إرسال طلب الزيارة بنجاح',
        offer: 'تم إرسال عرضك بنجاح'
      };

      toast.success(successMessages[contactType]);
      setMessage('');
      setOfferAmount('');
      setShowContactForm(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('فشل في إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };

  const nextImage = () => {
    if (property) {
      setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
    }
  };

  const prevImage = () => {
    if (property) {
      setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">جاري تحميل تفاصيل العقار...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="h-12 w-12 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">العقار غير موجود</h1>
          <p className="text-gray-600 mb-8">العقار الذي تبحث عنه غير موجود أو تم حذفه</p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-primary-600">الرئيسية</Link>
            <span className="text-gray-400">/</span>
            <Link to="/" className="text-gray-500 hover:text-primary-600">العقارات</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{property.title}</span>
          </nav>
        </div>
      </div>

      {/* Property Images Gallery */}
      <div className="relative h-96 md:h-[500px] bg-gray-900">
        <img
          src={property.images[currentImageIndex]}
          alt={property.title}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setShowImageModal(true)}
        />
        
        {/* Image Navigation */}
        {property.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-all duration-200 shadow-lg"
            >
              <ChevronLeft className="h-6 w-6 text-gray-900" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-all duration-200 shadow-lg"
            >
              <ChevronRight className="h-6 w-6 text-gray-900" />
            </button>
          </>
        )}
        
        {/* Image Counter and Actions */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="flex space-x-2">
            {property.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowImageModal(true)}
              className="flex items-center px-4 py-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg transition-all duration-200 shadow-sm"
            >
              <Camera className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">{property.images.length} صور</span>
            </button>
            
            <button
              onClick={handleShare}
              className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg transition-all duration-200 shadow-sm"
            >
              <Share2 className="h-5 w-5 text-gray-700" />
            </button>
            
            <button
              onClick={handleFavoriteToggle}
              className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg transition-all duration-200 shadow-sm"
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-error-500 text-error-500' : 'text-gray-700'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      property.category === 'rent' 
                        ? 'bg-accent-100 text-accent-700' 
                        : 'bg-secondary-100 text-secondary-700'
                    }`}>
                      {property.category === 'rent' ? 'للإيجار' : 'للبيع'}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium capitalize">
                      {property.type}
                    </span>
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{property.title}</h1>
                  
                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>{property.location.address}, {property.location.city}</span>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>{property.views} مشاهدة</span>
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-4 w-4 mr-1" />
                      <span>{property.favorites} إعجاب</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>تم النشر {new Date(property.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right mt-4 md:mt-0">
                  <p className="text-3xl md:text-4xl font-bold text-primary-600">
                    {property.price.toLocaleString('ar-SA')} ريال
                  </p>
                  {property.category === 'rent' && (
                    <p className="text-sm text-gray-500 mt-1">شهرياً</p>
                  )}
                </div>
              </div>

              {/* Property Features Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-gray-100">
                {property.bedrooms !== undefined && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Bed className="h-6 w-6" />
                    </div>
                    <p className="text-sm text-gray-500">غرف النوم</p>
                    <p className="text-lg font-semibold text-gray-900">{property.bedrooms}</p>
                  </div>
                )}
                
                {property.bathrooms !== undefined && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-accent-100 text-accent-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Bath className="h-6 w-6" />
                    </div>
                    <p className="text-sm text-gray-500">دورات المياه</p>
                    <p className="text-lg font-semibold text-gray-900">{property.bathrooms}</p>
                  </div>
                )}
                
                {property.area !== undefined && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-secondary-100 text-secondary-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Home className="h-6 w-6" />
                    </div>
                    <p className="text-sm text-gray-500">المساحة</p>
                    <p className="text-lg font-semibold text-gray-900">{property.area} م²</p>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-success-100 text-success-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-gray-500">الحالة</p>
                  <p className="text-lg font-semibold text-gray-900">متاح</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">وصف العقار</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">المميزات والخدمات</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {property.features.map((feature, index) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-primary-600 rounded-full mr-3"></div>
                    <span className="text-gray-700 font-medium">{feature.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">الموقع</h2>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-2" />
                  <p>خريطة الموقع</p>
                  <p className="text-sm">{property.location.address}, {property.location.city}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{property.sellerName || 'المالك'}</h3>
                <p className="text-sm text-gray-500">وكيل عقاري معتمد</p>
                <div className="flex items-center justify-center mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                  <span className="text-sm text-gray-500 mr-2">(4.8)</span>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">الهاتف</p>
                    <p className="font-medium">+966 12 345 6789</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                    <p className="font-medium">agent@example.com</p>
                  </div>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setContactType('inquiry');
                    setShowContactForm(true);
                  }}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center font-medium"
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  إرسال استفسار
                </button>
                
                <button
                  onClick={() => {
                    setContactType('visit');
                    setShowContactForm(true);
                  }}
                  className="w-full px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center font-medium"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  طلب زيارة
                </button>
                
                {property.category === 'sale' && (
                  <button
                    onClick={() => {
                      setContactType('offer');
                      setShowContactForm(true);
                    }}
                    className="w-full px-6 py-3 border-2 border-secondary-600 text-secondary-600 rounded-lg hover:bg-secondary-50 transition-colors flex items-center justify-center font-medium"
                  >
                    <Star className="h-5 w-5 mr-2" />
                    تقديم عرض
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">إحصائيات سريعة</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">المشاهدات</span>
                  <span className="font-semibold">{property.views}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">الإعجابات</span>
                  <span className="font-semibold">{property.favorites}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">الاستفسارات</span>
                  <span className="font-semibold">{property.inquiries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">تاريخ النشر</span>
                  <span className="font-semibold">{new Date(property.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {contactType === 'inquiry' && 'إرسال استفسار'}
                {contactType === 'visit' && 'طلب زيارة'}
                {contactType === 'offer' && 'تقديم عرض'}
              </h3>
              <button
                onClick={() => setShowContactForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-4">
              {contactType === 'offer' && (
                <div>
                  <label htmlFor="offerAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    مبلغ العرض (ريال سعودي)
                  </label>
                  <input
                    type="number"
                    id="offerAmount"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="أدخل مبلغ العرض"
                    required
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  {contactType === 'inquiry' && 'رسالتك'}
                  {contactType === 'visit' && 'تفاصيل الزيارة المطلوبة'}
                  {contactType === 'offer' && 'تفاصيل العرض'}
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={
                    contactType === 'inquiry' ? 'أنا مهتم بهذا العقار...' :
                    contactType === 'visit' ? 'أود زيارة العقار في...' :
                    'تفاصيل إضافية حول العرض...'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sendingMessage}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {sendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      جاري الإرسال...
                    </>
                  ) : (
                    'إرسال'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>
            
            <img
              src={property.images[currentImageIndex]}
              alt={property.title}
              className="max-w-full max-h-full object-contain"
            />
            
            {property.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronLeft className="h-12 w-12" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronRight className="h-12 w-12" />
                </button>
              </>
            )}
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
              {currentImageIndex + 1} / {property.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;