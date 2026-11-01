![openfront-sports-agents](.github/logo.svg)

# Next.js + KeystoneJS Starter

A modern full-stack application combining Next.js 15 with KeystoneJS 6, featuring admin dashboard implementation and sophisticated role-based permissions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjunaid33%2Fnext-keystone-starter%2F&stores=[{"type"%3A"postgres"}])

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/TK5wC1?referralCode=I_tWSs)

**Documentation:** [docs.openship.org/docs/openfront/sports-agents](https://docs.openship.org/docs/openfront/sports-agents)

## The Openfront Ecosystem

Every Openfront is open source and self-hostable. Try any of them on its live demo.

| Product | For | Repository | Demo | Docs |
|---|---|---|---|---|
| Openfront E-commerce | Online store: catalog, checkout, orders, fulfillment | [openfront](https://github.com/openshiporg/openfront) | [e-commerce.openship.org](https://e-commerce.openship.org) | [Docs](https://docs.openship.org/docs/openfront/ecommerce) |
| Openfront Restaurant | Online ordering, POS and kitchen display | [openfront-restaurant](https://github.com/openshiporg/openfront-restaurant) | [restaurant.openship.org](https://restaurant.openship.org) | [Docs](https://docs.openship.org/docs/openfront/restaurant) |
| Openfront Grocery | Grocery ordering, lots, expiry and pickup | [openfront-grocery](https://github.com/openshiporg/openfront-grocery) | [grocery.openship.org](https://grocery.openship.org) | [Docs](https://docs.openship.org/docs/openfront/grocery) |
| Openfront Gym | Memberships, classes, check-in and billing | [openfront-gym](https://github.com/openshiporg/openfront-gym) | [gym.openship.org](https://gym.openship.org) | [Docs](https://docs.openship.org/docs/openfront/gym) |
| Openfront Hotel | Reservations, front desk, housekeeping, folios | [openfront-hotel](https://github.com/openshiporg/openfront-hotel) | [hotel.openship.org](https://hotel.openship.org) | [Docs](https://docs.openship.org/docs/openfront/hotel) |
| Openfront Rental | Short-term rental bookings and calendars | [openfront-rental](https://github.com/openshiporg/openfront-rental) | [rental.openship.org](https://rental.openship.org) | [Docs](https://docs.openship.org/docs/openfront/rental) |
| Openfront Salon | Appointments, stylists and services | [openfront-salon](https://github.com/openshiporg/openfront-salon) | [salon.openship.org](https://salon.openship.org) | [Docs](https://docs.openship.org/docs/openfront/salon) |
| Openfront Barbershop | Bookings, walk-ins and barbers | [openfront-barbershop](https://github.com/openshiporg/openfront-barbershop) | [barbershop.openship.org](https://barbershop.openship.org) | [Docs](https://docs.openship.org/docs/openfront/barbershop) |
| Openfront Coffee Shop | Café ordering and counter POS | [openfront-coffeeshop](https://github.com/openshiporg/openfront-coffeeshop) | [coffee-shop.openship.org](https://coffee-shop.openship.org) | [Docs](https://docs.openship.org/docs/openfront/coffee-shop) |
| Openfront Real Estate | Listings, showings and transactions | [openfront-realestate](https://github.com/openshiporg/openfront-realestate) | [real-estate.openship.org](https://real-estate.openship.org) | [Docs](https://docs.openship.org/docs/openfront/real-estate) |
| Openfront Dealership | Inventory, test drives, deals and service | [openfront-dealership](https://github.com/openshiporg/openfront-dealership) | [dealership.openship.org](https://dealership.openship.org) | [Docs](https://docs.openship.org/docs/openfront/dealership) |
| Openfront Vape | Age-gated retail with compliance controls | [openfront-vape](https://github.com/openshiporg/openfront-vape) | [vape.openship.org](https://vape.openship.org) | [Docs](https://docs.openship.org/docs/openfront/vape) |
| Openfront Convenience | Convenience store POS and inventory | [openfront-convenience](https://github.com/openshiporg/openfront-convenience) | [convenience.openship.org](https://convenience.openship.org) | [Docs](https://docs.openship.org/docs/openfront/convenience) |
| Openfront Collectibles | Graded items, consignment and provenance | [openfront-collectibles](https://github.com/openshiporg/openfront-collectibles) | [collectibles.openship.org](https://collectibles.openship.org) | [Docs](https://docs.openship.org/docs/openfront/collectibles) |
| Openfront Cannabis | Dispensary menu, packages and recalls | [openfront-cannabis](https://github.com/openshiporg/openfront-cannabis) | [cannabis.openship.org](https://cannabis.openship.org) | [Docs](https://docs.openship.org/docs/openfront/cannabis) |
| Openfront Pharmacy | Prescriptions, inventory lots and pickup | [openfront-pharmacy](https://github.com/openshiporg/openfront-pharmacy) | [pharmacy.openship.org](https://pharmacy.openship.org) | [Docs](https://docs.openship.org/docs/openfront/pharmacy) |
| Openfront Med Spa | Treatments, consents and memberships | [openfront-medspa](https://github.com/openshiporg/openfront-medspa) | [medspa.openship.org](https://medspa.openship.org) | [Docs](https://docs.openship.org/docs/openfront/medspa) |
| Openfront Construction | Projects, bids, change orders and crews | [openfront-construction](https://github.com/openshiporg/openfront-construction) | [construction.openship.org](https://construction.openship.org) | [Docs](https://docs.openship.org/docs/openfront/construction) |
| Openfront Law Firm | Matters, intake, time and billing | [openfront-law-firm](https://github.com/openshiporg/openfront-law-firm) | [law-firm.openship.org](https://law-firm.openship.org) | [Docs](https://docs.openship.org/docs/openfront/law-firm) |
| Openfront Scheduling | Booking pages for appointment businesses | [openfront-scheduling](https://github.com/openshiporg/openfront-scheduling) | [scheduling.openship.org](https://scheduling.openship.org) | [Docs](https://docs.openship.org/docs/openfront/scheduling) |
| Openfront Social | Creator community and posts | [openfront-social](https://github.com/openshiporg/openfront-social) | [social.openship.org](https://social.openship.org) | [Docs](https://docs.openship.org/docs/openfront/social) |
| Openfront Rideshare | Rides, drivers and dispatch | [openfront-rideshare](https://github.com/openshiporg/openfront-rideshare) | [rideshare.openship.org](https://rideshare.openship.org) | [Docs](https://docs.openship.org/docs/openfront/rideshare) |
| Openfront Airline | Flights, booking and passenger operations | [openfront-airline](https://github.com/openshiporg/openfront-airline) | [airline.openship.org](https://airline.openship.org) | [Docs](https://docs.openship.org/docs/openfront/airline) |
| Openfront Hospital | Appointments, patients and care teams | [openfront-hospital](https://github.com/openshiporg/openfront-hospital) | [hospital.openship.org](https://hospital.openship.org) | [Docs](https://docs.openship.org/docs/openfront/hospital) |
| Openfront Sportsbook | Markets, bets and results | [openfront-sportsbook](https://github.com/openshiporg/openfront-sportsbook) | [sportsbook.openship.org](https://sportsbook.openship.org) | [Docs](https://docs.openship.org/docs/openfront/sportsbook) |
| Openfront Financial | Accounts, portfolios and advisory | [openfront-financial](https://github.com/openshiporg/openfront-financial) | [financial.openship.org](https://financial.openship.org) | [Docs](https://docs.openship.org/docs/openfront/financial) |
| Openfront Analytics | Privacy-friendly website analytics | [analytics](https://github.com/openshiporg/analytics) | [analytics.openship.org](https://analytics.openship.org) | [Docs](https://docs.openship.org/docs/openfront/analytics) |
| Openship | Order routing from sales channels to fulfillment | [openship](https://github.com/openshiporg/openship) | [os.openship.org](https://os.openship.org) | [Docs](https://docs.openship.org/docs/openship/ecommerce) |
| Marketplace | Shop across Openfront stores | [marketplace](https://github.com/openshiporg/marketplace) | [marketplace.openship.org](https://marketplace.openship.org) | [Docs](https://docs.openship.org/docs/openfront/marketplace) |
| **Openfront Sports Agents** (this repository) | Sports agency operations | [openfront-sports-agents](https://github.com/openshiporg/openfront-sports-agents) | [sports-agents.openship.org](https://sports-agents.openship.org) | [Docs](https://docs.openship.org/docs/openfront/sports-agents) |

## Architecture Overview

This project features a **modern admin architecture** with:

- **Backend**: KeystoneJS 6 providing GraphQL API, authentication, and database operations
- **Frontend**: Custom Next.js admin dashboard with enhanced UI components
- **Image Support**: S3-compatible image storage and management 

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Radix UI** primitives for accessible components
- **Tailwind CSS 4** for styling
- **Remix Icons** (@remixicon/react) for icons
- **SWR** for client-side data fetching
- **TipTap** for rich text editing
- **React Hook Form** for form management
- **Zod** for schema validation

### Backend
- **KeystoneJS 6** for GraphQL API and admin interface
- **Prisma ORM** for database operations
- **GraphQL Yoga** for GraphQL server
- **PostgreSQL** database
- **S3-compatible storage** for image management

### Key Features
- **Role-based access control** with granular permissions
- **Dynamic field controllers** with conditional behavior
- **Rich text editing** with document fields
- **Relationship management** with inline editing capabilities
- **Image upload and management** with S3 storage
- **Inline create/edit components** for seamless UX
- **Advanced filtering system** for all field types
- **Responsive design** with mobile support

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/junaid33/next-keystone-starter
   cd next-keystone-starter
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your database configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   This will:
   - Build KeystoneJS schema
   - Run database migrations
   - Start Next.js development server with Turbopack

4. **Access the application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
   - GraphQL API: [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql)

## Development Commands

- `npm run dev` - Build Keystone + migrate + start Next.js dev server
- `npm run build` - Build Keystone + migrate + build Next.js for production
- `npm run migrate:gen` - Generate and apply new database migrations
- `npm run migrate` - Deploy existing migrations to database
- `npm run lint` - Run ESLint

## API Endpoints

### GraphQL API
- **Endpoint**: `/api/graphql`
- **Features**: Full CRUD operations, relationships, authentication
- **Playground**: Available in development mode

## Data Models

### Core Models
- **User** - Authentication and user management
- **Role** - Role-based access control
- **Todo** - Example content model with relationships
- **TodoImage** - Image management for Todo items with S3 storage

### Permission System
Sophisticated role-based permissions including:
- `canAccessDashboard`, `canManagePeople`, `canManageRoles`
- `canCreateTodos`, `canManageAllTodos`
- `canSeeOtherPeople`, `canEditOtherPeople`

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/
│   │   └── graphql.ts     # GraphQL API endpoint
│   └── dashboard/         # Admin dashboard pages
├── features/
│   ├── keystone/          # Backend configuration
│   │   ├── models/        # Keystone list definitions
│   │   ├── access.ts      # Permission logic
│   │   └── mutations/     # Custom GraphQL mutations
│   └── dashboard/         # Admin interface implementation
│       ├── actions/       # Server actions
│       ├── components/    # Reusable UI components
│       ├── screens/       # Page-level components
│       └── views/         # Field type implementations
├── keystone.ts            # KeystoneJS configuration
└── schema.prisma          # Database schema
```

## Development Notes

- **GraphQL endpoint** available at `/api/graphql`
- **Field implementations** follow KeystoneJS controller patterns
- **Permission checks** are integrated throughout the UI layer
- **Server actions** used for data mutations in dashboard components
- **Inline editing** components provide seamless UX for relationship management
- **Image uploads** configured for S3-compatible storage
- **Advanced filtering** supports all field types including documents, JSON, and images

## Deployment

The application can be deployed to any platform supporting Node.js and PostgreSQL:

1. Set up PostgreSQL database
2. Configure environment variables
3. Run `npm run build`
4. Run `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request