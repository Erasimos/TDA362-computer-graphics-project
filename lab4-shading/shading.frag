#version 420

// required by GLSL spec Sect 4.5.3 (though nvidia does not, amd does)
precision highp float;

///////////////////////////////////////////////////////////////////////////////
// Material
///////////////////////////////////////////////////////////////////////////////
uniform vec3 material_color;
uniform float material_reflectivity;
uniform float material_metalness;
uniform float material_fresnel;
uniform float material_shininess;
uniform float material_emission;

uniform int has_color_texture;
layout(binding = 0) uniform sampler2D colorMap;

///////////////////////////////////////////////////////////////////////////////
// Environment
///////////////////////////////////////////////////////////////////////////////
layout(binding = 6) uniform sampler2D environmentMap;
layout(binding = 7) uniform sampler2D irradianceMap;
layout(binding = 8) uniform sampler2D reflectionMap;
uniform float environment_multiplier;

///////////////////////////////////////////////////////////////////////////////
// Light source
///////////////////////////////////////////////////////////////////////////////
uniform vec3 point_light_color = vec3(1.0, 1.0, 1.0);
uniform float point_light_intensity_multiplier = 50.0;

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////
#define PI 3.14159265359

///////////////////////////////////////////////////////////////////////////////
// Input varyings from vertex shader
///////////////////////////////////////////////////////////////////////////////
in vec2 texCoord;
in vec3 viewSpaceNormal;
in vec3 viewSpacePosition;

///////////////////////////////////////////////////////////////////////////////
// Input uniform variables
///////////////////////////////////////////////////////////////////////////////
uniform mat4 viewInverse;
uniform vec3 viewSpaceLightPosition;

///////////////////////////////////////////////////////////////////////////////
// Output color
///////////////////////////////////////////////////////////////////////////////
layout(location = 0) out vec4 fragmentColor;


vec3 calculateDirectIllumiunation(vec3 wo, vec3 n, vec3 base_color)
{
	vec3 direct_illum = base_color;
	///////////////////////////////////////////////////////////////////////////
	// Task 1.2 - Calculate the radiance Li from the light, and the direction
	//            to the light. If the light is backfacing the triangle,
	//            return vec3(0);
	///////////////////////////////////////////////////////////////////////////

	// distanceVector to light source
	vec3 distVec = viewSpaceLightPosition - viewSpacePosition;
	// distance from fragment to light source
	float d = length(distVec);
	// Incoming radiance
	vec3 Li = point_light_intensity_multiplier * point_light_color * (1.0/(d*d));
	vec3 Wi = normalize(distVec);
	float ndotwo = max(0.0, dot(n, wo));
	float ndotwi = max(0.0, dot(n, Wi));
	float denom = (4.0*ndotwo*ndotwi);
	// Return black if not visible
	if(denom <= 0.0) { return vec3(0.0); }
	

	

		///////////////////////////////////////////////////////////////////////////
		// Task 1.3 - Calculate the diffuse term and return that as the result
		///////////////////////////////////////////////////////////////////////////
	vec3 diffuse_term = material_color * (1.0/PI) * abs(ndotwi) * Li; 

	///////////////////////////////////////////////////////////////////////////
	// Task 2 - Calculate the Torrance Sparrow BRDF and return the light
	//          reflected from that instead
	///////////////////////////////////////////////////////////////////////////
	

	// Wh
	vec3 Wh = normalize(Wi + wo);	
	float wodotwh = max(0.0, dot(wo, Wh));
	float ndotwh = max(0.0, dot(n, Wh));

	// The fresnel term
	float R0 = material_fresnel;
	float F = R0 + (1.0 - R0)*pow((1.0 - wodotwh),5.0);

	// Microfacet distribution
	float s = material_shininess;
	float D = ((s+2.0)/(2.0*PI))*pow(ndotwh,s);

	// A
	float A = 2.0*ndotwh*ndotwo/wodotwh;

	// B
	float B = 2.0*ndotwh*ndotwi/wodotwh;

	// Shadowing/Masking function
	float G = min(1.0,min(A,B));

	// brdf
	float brdf = F*D*G/denom;	

	///////////////////////////////////////////////////////////////////////////
	// Task 3 - Make your shader respect the parameters of our material model.
	///////////////////////////////////////////////////////////////////////////
	
	// Dielectric term
	vec3 dielectric_term = brdf * ndotwi * Li + (1-F) * diffuse_term;

	// Metal term 
	vec3 metal_term = brdf * material_color * ndotwi * Li;

	// Microfacet term
	float m = material_metalness;
	vec3 micro_facet_term = m * metal_term + (1 - m) * dielectric_term;

	float r = material_reflectivity;
	//return diffuse_term;
	//return brdf * ndotwi * Li;
	return r * micro_facet_term + (1 - r) * diffuse_term;


	
}

vec3 calculateIndirectIllumination(vec3 wo, vec3 n, vec3 base_color)
{
	vec3 indirect_illum = vec3(0.f);
	///////////////////////////////////////////////////////////////////////////
	// Task 5 - Lookup the irradiance from the irradiance map and calculate
	//          the diffuse reflection
	///////////////////////////////////////////////////////////////////////////

	// World space normal
	vec3 nws = vec3 (viewInverse * vec4(n,1.0f));


	// Calculate the world-space position of this fragment on the near plane
	vec4 pixel_world_pos = viewInverse * vec4(texCoord * 2.0 - 1.0, 1.0, 1.0);
	pixel_world_pos = (1.0 / pixel_world_pos.w) * pixel_world_pos;

	// Calculate the world-space direction from the camera to that position
	vec3 camera_pos = vec3(viewInverse * vec4(0.0));

	vec3 dir = normalize(pixel_world_pos.xyz - camera_pos);

	//Calculate the spherical coordinates of the direction
	float theta = acos(max(-1.0f, min(1.0f, dir.y)));
	float phi = atan(dir.z, dir.x);
	if(phi < 0.0f)
	{
		phi = phi + 2.0f * PI;
	}

	// Use these to lookup the color in the environment map
	vec2 lookup = vec2(phi / (2.0 * PI), theta / PI);
	vec4 irradiance = environment_multiplier * texture(irradianceMap, lookup);

	vec4 diffuse_term = vec4 (material_color,0) * (1.0 / PI) * irradiance;
	///////////////////////////////////////////////////////////////////////////
	// Task 6 - Look up in the reflection map from the perfect specular
	//          direction and calculate the dielectric and metal terms.
	///////////////////////////////////////////////////////////////////////////

	//return indirect_illum;
	return vec3(diffuse_term);
}


void main()
{
	///////////////////////////////////////////////////////////////////////////
	// Task 1.1 - Fill in the outgoing direction, wo, and the normal, n. Both
	//            shall be normalized vectors in view-space.
	///////////////////////////////////////////////////////////////////////////
	vec3 wo = normalize(-viewSpacePosition);
	vec3 n = normalize(viewSpaceNormal);

	vec3 base_color = material_color;
	if(has_color_texture == 1)
	{
		base_color *= texture(colorMap, texCoord).xyz;
	}

	vec3 direct_illumination_term = vec3(0.0);
	{ // Direct illumination
		direct_illumination_term = calculateDirectIllumiunation(wo, n, base_color);
	}

	vec3 indirect_illumination_term = vec3(0.0);
	{ // Indirect illumination
		indirect_illumination_term = calculateIndirectIllumination(wo, n, base_color);
	}

	///////////////////////////////////////////////////////////////////////////
	// Task 1.4 - Make glowy things glow!
	///////////////////////////////////////////////////////////////////////////
	vec3 emission_term = material_emission * material_color;

	vec3 final_color = direct_illumination_term + indirect_illumination_term + emission_term;

	// Check if we got invalid results in the operations
	if(any(isnan(final_color)))
	{
		final_color.xyz = vec3(1.f, 0.f, 1.f);
	}

	fragmentColor.xyz = final_color;
}
