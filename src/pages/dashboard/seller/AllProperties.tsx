import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  SortAsc,
  Eye,
  Heart,
  MessageSquare,
  Trash2,
  Edit,
  Plus,
  MoreVertical,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { Property, PropertyStatus, PropertyType, PropertyCategory } from '../../../types/property';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import { toast } from 'react-toastify';

const AllProperties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PropertyStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<PropertyType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    if (!user) return;

    const fetchProperties = async () => {
      setLoading(true);
      try {
        let propertiesQuery = query(
          collection(db, 'properties'),
          where('sellerId', '==', user.uid)
        );

        // Apply filters
        if (selectedStatus !== 'all') {
          propertiesQuery = query(propertiesQuery, where('status', '==', selectedStatus));
        }
        if (selectedType !== 'all') {
          propertiesQuery = query(propertiesQuery, where('type', '==', selectedType));
        }
        if (selectedCategory !== 'all') {
          propertiesQuery = query(propertiesQuery, where('category', '==', selectedCategory));
        }

        // Apply sorting
        propertiesQuery = query(
          propertiesQuery,
          orderBy(
            sortBy === 'date' ? 'createdAt' : 
            sortBy === 'views' ? 'views' : 'price',
            sortOrder
          )
        );

        const snapshot = await getDocs(propertiesQuery);
        let propertiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Property[];

        // Apply search filter
        if (searchQuery) {
          propertiesData = propertiesData.filter(property =>
            property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            property.location.city.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setProperties(propertiesData);
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast.error('فشل في تحميل العقارات');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user, selectedStatus, selectedType, selectedCategory, sortBy, sortOrder, searchQuery]);

  const handleDelete = async (propertyId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) return;

    try {
      await deleteDoc(doc(db, 'properties', propertyId));
      setProperties(properties.filter(p => p.id !== propertyId));
      toast.success('تم حذف العقار بنجاح');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('فشل في حذف العقار');
    }
  };

  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-success-100 text-success-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      case 'rejected':
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: PropertyStatus) => {
    switch (status) {
      case 'approved':
        return 'مُعتمد';
      case 'pending':
        return 'قيد المراجعة';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  };

  const PropertyGridCard = ({ property }: { property: Property }) => (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <div className="relative">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
            {getStatusText(property.status)}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            property.category === 'rent' ? 'bg-accent-600 text-white' : 'bg-secondary-600 text-white'
          }`}>
            {property.category === 'rent' ? 'للإيجار' : 'للبيع'}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">{property.title}</h3>
        <p className="text-sm text-gray-600 mb-3">{property.location.city}</p>
        
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-bold text-primary-600">
            {property.price.toLocaleString('ar-SA')} ريال
          </span>
          <span className="text-sm text-gray-500 capitalize">{property.type}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              <span>{property.views}</span>
            </div>
            <div className="flex items-center">
              <Heart className="h-4 w-4 mr-1" />
              <span>{property.favorites}</span>
            </div>
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>{property.inquiries}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Link
            to={`/properties/${property.id}`}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            عرض العقار
          </Link>
          <div className="flex items-center space-x-2">
            <Link
              to={`/dashboard/properties/edit/${property.id}`}
              className="p-1 text-gray-400 hover:text-primary-600"
            >
              <Edit className="h-4 w-4" />
            </Link>
            <button
              onClick={() => handleDelete(property.id)}
              className="p-1 text-gray-400 hover:text-error-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="جميع العقارات">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">عقاراتي</h1>
            <p className="text-gray-600 mt-1">إدارة جميع عقاراتك المدرجة</p>
          </div>
          
          <Link
            to="/dashboard/seller/properties/add"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            إضافة عقار جديد
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <input
                type="text"
                placeholder="البحث في العقارات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PropertyStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد المراجعة</option>
              <option value="approved">مُعتمد</option>
              <option value="rejected">مرفوض</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as PropertyType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">جميع الأنواع</option>
              <option value="apartment">شقة</option>
              <option value="villa">فيلا</option>
              <option value="office">مكتب</option>
              <option value="land">أرض</option>
              <option value="commercial">تجاري</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PropertyCategory | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">جميع الفئات</option>
              <option value="rent">للإيجار</option>
              <option value="sale">للبيع</option>
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">ترتيب حسب:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'views' | 'price')}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="date">التاريخ</option>
                  <option value="views">المشاهدات</option>
                  <option value="price">السعر</option>
                </select>
                <button
                  onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                  className="p-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <SortAsc className={`h-4 w-4 text-gray-500 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Filter className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Building2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Properties List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">جاري تحميل العقارات...</p>
            </div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">لا توجد عقارات</h3>
            <p className="mt-1 text-gray-500">
              {searchQuery ? 'جرب تعديل معايير البحث أو الفلاتر' : 'ابدأ بإضافة عقارك الأول'}
            </p>
            {!searchQuery && (
              <Link
                to="/dashboard/seller/properties/add"
                className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                إضافة عقار
              </Link>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((property) => (
              <PropertyGridCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      العقار
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النوع
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      السعر
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإحصائيات
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={property.images[0]}
                              alt={property.title}
                            />
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">
                              {property.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {property.location.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {property.type}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {property.category === 'rent' ? 'للإيجار' : 'للبيع'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {property.price.toLocaleString('ar-SA')} ريال
                        </div>
                        {property.category === 'rent' && (
                          <div className="text-xs text-gray-500">شهرياً</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(property.status)}`}>
                          {getStatusText(property.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {property.views}
                          </div>
                          <div className="flex items-center">
                            <Heart className="h-4 w-4 mr-1" />
                            {property.favorites}
                          </div>
                          <div className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {property.inquiries}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            to={`/properties/${property.id}`}
                            className="text-accent-600 hover:text-accent-900"
                          >
                            عرض
                          </Link>
                          <Link
                            to={`/dashboard/seller/properties/edit/${property.id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            تعديل
                          </Link>
                          <button
                            onClick={() => handleDelete(property.id)}
                            className="text-error-600 hover:text-error-900"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AllProperties;