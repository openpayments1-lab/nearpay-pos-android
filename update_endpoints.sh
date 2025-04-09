#!/bin/bash
# Update all API endpoints to remove leading slashes
sed -i 's|return this.makeApiRequest<[^>]*>('"'"'/|return this.makeApiRequest<[^>]*>('"'"'|g' server/services/DejavooApiService.ts
