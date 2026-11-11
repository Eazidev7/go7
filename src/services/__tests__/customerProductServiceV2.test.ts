import { getDocs } from 'firebase/firestore';
import { clearVendorListCache, getExploreVendors } from '../customerProductServiceV2';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, ...parts) => parts.join('/')),
  query: jest.fn(ref => ref),
  limit: jest.fn(),
  getDocs: jest.fn(),
}));
jest.mock('../../config/firebase', () => ({ db: {} }));
jest.mock('../productServiceV2', () => ({}));
jest.mock('../../utils/vendorImage', () => ({ resolveVendorImage: () => '' }));
jest.mock('../../utils/firestoreDate', () => ({}));
jest.mock('../../utils/vendorVisibility', () => ({
  isVendorPubliclyVisible: data => data.approved === true,
  isProductCustomerVisible: data => data.isActive !== false,
  toVendorListingInfo: doc => ({ id: doc.id, ...doc.data() }),
  vendorMatchesCategory: (vendor, category) => vendor.vendorType === category,
}));

const rawVendors = [
  { id: 'dalish', name: 'Dalish Restaurant', approved: true, vendorType: 'restaurant', categories: ['food'] },
  { id: 'bokku', name: 'Bokku Mart', approved: true, vendorType: 'groceries', categories: ['groceries', 'supermarket'] },
  { id: 'pharmacy', name: 'Pharmacy', approved: true, vendorType: 'pharmacy', categories: ['pharmacy'] },
];

beforeEach(() => {
  clearVendorListCache();
  (getDocs as jest.Mock).mockImplementation(async ref => ({
    docs: ref === 'vendors'
      ? rawVendors.map(v => ({ id: v.id, data: () => v }))
      : [{ id: 'product', data: () => ({ isActive: true }) }],
  }));
});

it.each([
  ['Restaurants', 'dalish'],
  ['Groceries', 'bokku'],
  ['Pharmacies', 'pharmacy'],
])('returns %s vendors with matching UI category labels', async (category, id) => {
  const vendors = await getExploreVendors(category);
  const visible = vendors.filter(v => v.categories[0] === category);
  expect(visible.map(v => v.id)).toEqual([id]);
});

it('keeps all-category labels consistent with category entry points', async () => {
  const vendors = await getExploreVendors('All');
  expect(vendors.map(v => v.categories[0]).sort()).toEqual(['Groceries', 'Pharmacies', 'Restaurants']);
  expect(rawVendors[0].categories).toEqual(['food']);
  expect(rawVendors[1].categories).toEqual(['groceries', 'supermarket']);
});

it('does not add vendors to a category with no matches', async () => {
  expect(await getExploreVendors('electronics')).toEqual([]);
});
