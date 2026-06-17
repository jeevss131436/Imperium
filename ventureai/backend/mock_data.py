from ventureai.backend.models import (
    StartupProfile,
    MarketAnalysis,
    FounderAnalysis,
    FinancialAnalysis,
    BearCase,
    InvestmentMemo,
)

MOCK_STARTUP_PROFILE = StartupProfile(
    company_name="Airbnb",
    one_liner="A marketplace for people to list, discover, and book unique accommodations around the world.",
    stage="Seed",
    industry="Travel / Marketplace",
    founders=["Brian Chesky", "Joe Gebbia", "Nathan Blecharczyk"],
    funding_history=[
        {"round": "Seed", "amount": "$20K", "investor": "Y Combinator", "year": 2009},
        {"round": "Angel", "amount": "$600K", "investors": "Various angels", "year": 2009},
    ],
    location="San Francisco, CA",
    website="https://www.airbnb.com",
    raw_description="Airbnb is a peer-to-peer marketplace that lets homeowners rent out their spaces to travelers.",
    score=88,
    summary="Strong marketplace concept targeting the massive global travel market with unique peer-to-peer supply.",
)

MOCK_MARKET_ANALYSIS = MarketAnalysis(
    tam="$1.2T global travel and accommodation market",
    market_growth="~7% CAGR through 2030; short-term rental segment growing faster at ~11% CAGR",
    timing_verdict="Strong — peer trust infrastructure (smartphones, social graphs, payments) only recently mature enough to support this model",
    competitors=["Hotels.com", "VRBO", "Booking.com", "HomeAway", "Traditional hotel chains"],
    differentiation=(
        "Unique peer-to-peer inventory unavailable on any other platform; "
        "two-sided trust/review system creates defensible network effects; "
        "price point typically 30–50% below comparable hotels"
    ),
    market_score=85,
    key_risks=[
        "Regulatory backlash in major cities (NYC, Berlin, Barcelona) limiting short-term rentals",
        "Host supply concentration — top 10% of hosts often account for majority of listings",
        "Commoditization pressure as hosts multi-home on VRBO and Booking.com",
        "Macro travel downturns (pandemic, recession) hit discretionary travel first",
    ],
    summary=(
        "Massive and growing market with Airbnb commanding significant category mindshare. "
        "Regulatory headwinds are real but manageable; network effects create a durable moat."
    ),
)

MOCK_FOUNDER_ANALYSIS = FounderAnalysis(
    founders=[
        {
            "name": "Brian Chesky",
            "background": "Industrial design, RISD graduate",
            "domain_expertise": "Product design, brand building, relentless storytelling",
            "red_flags": "No prior hospitality or marketplace experience at founding",
        },
        {
            "name": "Joe Gebbia",
            "background": "Graphic design, RISD graduate",
            "domain_expertise": "Design thinking, growth hacking, community building",
            "red_flags": "None significant",
        },
        {
            "name": "Nathan Blecharczyk",
            "background": "Computer Science, Harvard University",
            "domain_expertise": "Full-stack engineering, technical architecture, scalability",
            "red_flags": "None significant",
        },
    ],
    team_completeness=(
        "Strong — design (Chesky + Gebbia) plus technical (Blecharczyk) covered from day one; "
        "sales/BD gap filled by founders themselves in early days"
    ),
    prior_exits=False,
    founder_score=88,
    summary=(
        "Scrappy, design-led founding team with highly complementary skills. "
        "No prior exits, but demonstrated extreme resilience (Obama O's / Cap'n McCain's cereal stunt). "
        "Chesky's obsessive product focus and storytelling ability are rare founder traits."
    ),
)

MOCK_FINANCIAL_ANALYSIS = FinancialAnalysis(
    revenue_model="Commission marketplace — ~3% service fee from hosts, ~14.2% guest service fee per booking",
    unit_economics={
        "blended_take_rate": "~17%",
        "cac": "Low — primarily organic and word-of-mouth; SEO and referral loops",
        "ltv": "High — travelers book repeatedly; hosts generate recurring revenue",
        "gross_margin": "~75% at scale (platform is asset-light)",
        "payback_period": "Estimated < 12 months at seed stage",
    },
    raise_amount="$600K seed round",
    burn_assessment=(
        "Lean — founders deferred salaries, used creative bootstrapping "
        "(selling Obama O's cereal boxes to fund operations)"
    ),
    path_to_profitability=(
        "Clear marketplace flywheel: more guests → more hosts → more listings → more guests. "
        "Incremental cost per transaction is near-zero; profitability driven by volume, not margin expansion."
    ),
    financial_score=82,
    red_flags=[
        "Heavy dependence on Stripe for payment processing — single point of failure",
        "Trust and safety incidents (property damage, assault) could spike insurance and support costs",
        "Chargeback and fraud risk inherent in peer-to-peer transactions",
    ],
    summary=(
        "Excellent unit economics with high gross margins and near-zero marginal cost per booking. "
        "Viral acquisition and strong LTV make this capital-efficient. "
        "Key financial risk is tail-event liability (property damage, safety), not the core business model."
    ),
)

MOCK_BEAR_CASE = BearCase(
    market_challenges=[
        "Cities are actively passing laws to ban or severely restrict short-term rentals — this isn't theoretical, it's happening now in NYC, Berlin, and Barcelona",
        "Hotel lobbies have deep regulatory relationships and will continue pressuring legislators",
        "The 'unique experience' angle commoditizes fast — guests increasingly want predictable quality, which hotels deliver better",
        "A single major macro shock (pandemic, recession) collapses the entire demand side overnight",
    ],
    founder_challenges=[
        "None of the founders have built a marketplace before — trust and liquidity bootstrapping is notoriously hard",
        "Design-heavy founders may underinvest in operations, trust/safety, and customer support at scale",
        "No hospitality domain expertise means blind spots in host quality management and guest expectations",
    ],
    financial_challenges=[
        "17% take rate is already high and will face pressure as the market matures and hosts gain negotiating power",
        "A single catastrophic safety incident (and associated lawsuit) could wipe out a year of gross profit",
        "Payment processing and insurance costs will compress margins significantly at scale",
        "International expansion is extremely expensive — regulatory, localization, and payments complexity per market",
    ],
    failure_modes=[
        "Regulatory death by a thousand cuts — city-by-city bans eventually remove enough supply to break the marketplace",
        "A high-profile safety incident triggers media storm, drives host churn, and collapses guest trust simultaneously",
        "Hotels respond with boutique/unique offerings and price-match, eliminating Airbnb's core differentiation",
        "Professional hosts dominate supply, turning the platform into a hotel aggregator with worse unit economics",
    ],
    bear_case_score=35,
    summary=(
        "Airbnb's core risks are regulatory and tail-event liability, not the business model itself. "
        "The bear case requires either coordinated global regulation OR a catastrophic safety event — "
        "both possible but not base case. Score of 35 reflects real but manageable downside."
    ),
)

MOCK_INVESTMENT_MEMO = InvestmentMemo(
    verdict="INVEST",
    confidence_score=82,
    executive_summary=(
        "Airbnb is a category-defining marketplace attacking a $1.2T travel market with unique peer-to-peer supply, "
        "strong network effects, and exceptional unit economics. The founding team is scrappy and design-obsessed "
        "with complementary skills. Primary risks are regulatory and tail-event liability, not the core business model. "
        "At seed stage valuation, the risk/reward is compelling."
    ),
    market_score=85,
    founder_score=88,
    financial_score=82,
    bear_case_score=35,
    overall_score=82,
    recommendation=(
        "Invest at seed. Lead the round if possible to secure pro-rata rights for Series A. "
        "Key milestones to track: GMV growth, host retention, and first major regulatory challenge response."
    ),
    due_diligence_questions=[
        "What is the current host churn rate, and what are the top reasons hosts leave the platform?",
        "How does the team plan to respond to the NYC regulatory push specifically?",
        "What is the current trust/safety incident rate per 1,000 bookings, and what's the resolution process?",
        "Has the team modeled unit economics at 10x and 100x current GMV?",
        "What is the plan for international expansion and which markets are prioritized first?",
        "What IP or defensibility exists beyond network effects (patents, exclusive partnerships)?",
    ],
    suggested_valuation_range="$2.5M–$4M pre-money (seed stage; 15–20x ARR if annualizing current GMV run rate)",
    summary=(
        "Strong INVEST recommendation. Airbnb has the rare combination of a massive market, defensible network effects, "
        "excellent unit economics, and a founder team that has demonstrated conviction under pressure. "
        "Regulatory risk is real but not company-ending at this stage."
    ),
)
