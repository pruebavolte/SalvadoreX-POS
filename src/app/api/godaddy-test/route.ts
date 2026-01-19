import { NextResponse } from "next/server";
import axios from "axios";

const GODADDY_API_URL = "https://api.godaddy.com";
const DOMAIN = "negocio.international";

export async function GET() {
  const apiKey = process.env.GODADDY_API_KEY;
  const apiSecret = process.env.GODADDY_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ 
      error: "Credenciales no configuradas",
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    }, { status: 500 });
  }

  const headers = {
    "Authorization": `sso-key ${apiKey}:${apiSecret}`,
    "Content-Type": "application/json",
  };

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    domain: DOMAIN,
    tests: {}
  };

  // Test 1: Check domains list (see if auth works)
  try {
    const domainsResponse = await axios.get(`${GODADDY_API_URL}/v1/domains`, { headers });
    results.tests = {
      ...results.tests as object,
      domainsList: {
        success: true,
        count: domainsResponse.data?.length || 0,
        domains: domainsResponse.data?.map((d: { domain: string }) => d.domain) || []
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      results.tests = {
        ...results.tests as object,
        domainsList: {
          success: false,
          status: error.response?.status,
          error: error.response?.data
        }
      };
    }
  }

  // Test 2: Check if specific domain exists and we have access
  try {
    const domainResponse = await axios.get(`${GODADDY_API_URL}/v1/domains/${DOMAIN}`, { headers });
    results.tests = {
      ...results.tests as object,
      domainDetails: {
        success: true,
        data: domainResponse.data
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      results.tests = {
        ...results.tests as object,
        domainDetails: {
          success: false,
          status: error.response?.status,
          error: error.response?.data
        }
      };
    }
  }

  // Test 3: Try to get existing DNS records
  try {
    const recordsResponse = await axios.get(`${GODADDY_API_URL}/v1/domains/${DOMAIN}/records`, { headers });
    results.tests = {
      ...results.tests as object,
      dnsRecords: {
        success: true,
        count: recordsResponse.data?.length || 0,
        records: recordsResponse.data?.slice(0, 10) // Show first 10 records
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      results.tests = {
        ...results.tests as object,
        dnsRecords: {
          success: false,
          status: error.response?.status,
          error: error.response?.data
        }
      };
    }
  }

  // Test 4: Try to create a test CNAME record
  try {
    const testSubdomain = `apitest${Date.now()}`;
    const testRecords = [{ data: "salvadorex.replit.app", ttl: 600 }];
    
    await axios.put(
      `${GODADDY_API_URL}/v1/domains/${DOMAIN}/records/CNAME/${testSubdomain}`,
      testRecords,
      { headers }
    );
    
    results.tests = {
      ...results.tests as object,
      createRecord: {
        success: true,
        subdomain: testSubdomain,
        message: "Record created successfully"
      }
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      results.tests = {
        ...results.tests as object,
        createRecord: {
          success: false,
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.response?.data,
          headers: error.response?.headers
        }
      };
    }
  }

  return NextResponse.json(results);
}
