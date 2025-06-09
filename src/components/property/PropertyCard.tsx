import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Home, 
  Heart, 
  TagIcon, 
  Share2,
  Eye,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Property } from '../../types/property';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';

interface PropertyCardProps {
  property: Property;
  viewMode?: 'grid' | 'list';
  onFavoriteToggle?: (propertyId: string, isFavorited: boolean) => void;
}

const PropertyCard = ({ property, viewMode = 'grid', onFavoriteToggle }: PropertyCardProps) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Check if property is favorited when component mounts
  useState(() => {
    const checkIfFavorited = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const favorites = userData.favorites || [];
          setIsFavorite(favorites.includes(property.id));
        }
      } catch (error) {
        console.error('Error checking favorites status:', error);
      }
    };

    checkIfFavorited();
  });

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.info('يرجى تسجيل الدخول لحفظ العقارات في المفضلة');
      return;
    }

    if (isLoading) return;

    try {
      setIsLoading(true);
      const userRef = doc(db, 'users', user.uid);
      
      if (isFavorite) {
        // Remove from favorites
        await updateDoc(userRef, {
          favorites: arrayRemove(property.id)
        });
        setIsFavorite(false);
        toast.success('تم إزالة العقار من المفضلة');
      } else {
        // Add to favorites
        await updateDoc(userRef, {
          favorites: arrayUnion(property.id)
        });
        setIsFavorite(true);
        toast.success('تم إضافة العقار إلى المفضلة');
      }

      // Call the callback if provided
      if (onFavoriteToggle) {
        onFavoriteToggle(property.id, !isFavorite);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      toast.error('فشل في تحديث المفضلة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: property.title,
      text: property.description,
      url: `${window.location.origin}/properties/${property.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('تم نسخ رابط العقار');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
        <div className="flex flex-col md:flex-row">
          {/* Property Image */}
          <div className="relative md:w-80 h-64 md:h-auto">
            <Link to={`/properties/${property.id}`}>
              <img 
                src={property.images[0]} 
                alt={property.title} 
                className="w-full h-full object-cover"
              />
            </Link>
            
            {/* Property Category Tag */}
            <div className="absolute top-4 left-4">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                property.category === 'rent' 
                  ? 'bg-accent-600 text-white' 
                  : 'bg-secondary-600 text-white'
              }`}>
                {property.category === 'rent' ? 'للإيجار' : 'للبيع'}
              </span>
            </div>
            
            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={handleFavoriteToggle}
                disabled={isLoading}
                className="p-2 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all duration-200 shadow-sm"
                aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
              >
                <Heart 
                  className={`h-5 w-5 transition-colors ${
                    isFavorite ? 'fill-error-500 text-error-500' : 'text-gray-600 hover:text-error-500'
                  }`} 
                />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all duration-200 shadow-sm"
                aria-label="مشاركة العقار"
              >
                <Share2 className="h-5 w-5 text-gray-600 hover:text-primary-600" />
              </button>
            </div>
          </div>
          
          {/* Property Content */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 hover:text-primary-600 transition-colors mb-2">
                  <Link to={`/properties/${property.id}`}>{property.title}</Link>
                </h3>
                <div className="flex items-center text-gray-500 mb-3">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="text-sm">{property.location.address}, {property.location.city}</span>
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold text-primary-600">
                  {property.price.toLocaleString('ar-SA')} ريال
                </p>
                {property.category === 'rent' && (
                  <p className="text-sm text-gray-500">شهرياً</p>
                )}
              </div>
            </div>
            
            {/* Property Features */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-6">
                {property.bedrooms !== undefined && (
                  <div className="flex items-center">
                    <Bed className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{property.bedrooms} غرف نوم</span>
                  </div>
                )}
                
                {property.bathrooms !== undefined && (
                  <div className="flex items-center">
                    <Bath className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{property.bathrooms} حمامات</span>
                  </div>
                )}
                
                {property.area !== undefined && (
                  <div className="flex items-center">
                    <Home className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{property.area} م²</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  <span>{property.views}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{new Date(property.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            </div>
            
            {/* Description */}
            <p className="text-gray-600 text-sm line-clamp-2 mb-4">
              {property.description}
            </p>
            
            {/* Property Type and Features */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TagIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-500 capitalize">{property.type}</span>
              </div>
              
              <Link
                to={`/properties/${property.id}`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                عرض التفاصيل
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 group">
      {/* Property Image */}
      <div className="relative overflow-hidden">
        <Link to={`/properties/${property.id}`}>
          <img 
            src={property.images[0]} 
            alt={property.title} 
            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>
        
        {/* Property Category Tag */}
        <div className="absolute top-4 left-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
            property.category === 'rent' 
              ? 'bg-accent-600 text-white' 
              : 'bg-secondary-600 text-white'
          }`}>
            {property.category === 'rent' ? 'للإيجار' : 'للبيع'}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleFavoriteToggle}
            disabled={isLoading}
            className="p-2 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all duration-200 shadow-sm backdrop-blur-sm"
            aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          >
            <Heart 
              className={`h-5 w-5 transition-colors ${
                isFavorite ? 'fill-error-500 text-error-500' : 'text-gray-600 hover:text-error-500'
              }`} 
            />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 transition-all duration-200 shadow-sm backdrop-blur-sm"
            aria-label="مشاركة العقار"
          >
            <Share2 className="h-5 w-5 text-gray-600 hover:text-primary-600" />
          </button>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
            <p className="text-lg font-bold text-primary-600">
              {property.price.toLocaleString('ar-SA')} ريال
            </p>
            {property.category === 'rent' && (
              <p className="text-xs text-gray-500">شهرياً</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Property Content */}
      <div className="p-5">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors mb-2 line-clamp-1">
            <Link to={`/properties/${property.id}`}>{property.title}</Link>
          </h3>
          <div className="flex items-center text-gray-500">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm line-clamp-1">{property.location.city}</span>
          </div>
        </div>
        
        {/* Property Features */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            {property.bedrooms !== undefined && (
              <div className="flex items-center">
                <Bed className="h-4 w-4 text-gray-400 mr-1" />
                <span className="text-sm text-gray-600">{property.bedrooms}</span>
              </div>
            )}
            
            {property.bathrooms !== undefined && (
              <div className="flex items-center">
                <Bath className="h-4 w-4 text-gray-400 mr-1" />
                <span className="text-sm text-gray-600">{property.bathrooms}</span>
              </div>
            )}
            
            {property.area !== undefined && (
              <div className="flex items-center">
                <Home className="h-4 w-4 text-gray-400 mr-1" />
                <span className="text-sm text-gray-600">{property.area}م²</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center text-xs text-gray-500">
            <Eye className="h-3 w-3 mr-1" />
            <span>{property.views}</span>
          </div>
        </div>
        
        {/* Property Type and Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TagIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-500 capitalize">{property.type}</span>
          </div>
          
          <Link
            to={`/properties/${property.id}`}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors"
          >
            عرض التفاصيل ←
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;