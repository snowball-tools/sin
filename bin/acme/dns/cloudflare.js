export const timeout = 20000

export async function add(name, content, domain) {
  const zone = process.env.CF_ZONE
      , token = process.env.CF_TOKEN

  if (!zone && !token)
    throw new Error('ACME: You must supply env CF_ZONE and CF_TOKEN')

  const x = await fetch('https://api.cloudflare.com/client/v4/zones/' + zone + '/dns_records', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      content,
      type: 'TXT',
      comment: 'Sin.js ACME challenge for ' + domain,
      ttl: 120
    })
  })

  if (!x.ok)
    throw new Error('Bad cloudflare response ' + x.status + ': ' + (await x.text()))

  return (await x.json()).result.id
}

export async function remove(id) {
  await fetch('https://api.cloudflare.com/client/v4/zones/' + process.env.CF_ZONE + '/dns_records/' + id, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + process.env.CF_TOKEN,
      'X-Auth-Email': ''
    }
  })
}
